/**
 * SmartTaskDetector — Heuristic analysis of user messages to determine
 * whether a todo list should be auto-created.
 * Ported from Chaterm's src/main/agent/core/task/todo-tools/todo-prompts.ts
 */

// ============================================================================
// Thresholds
// ============================================================================
export const MIN_MESSAGE_LENGTH = 10;
export const MIN_STEPS_FOR_TODO = 3;
export const MIN_SIGNALS_FOR_COMPLEX = 2;

// ============================================================================
// Domain heuristics — CN and EN patterns
// ============================================================================

// Complex action keywords
const COMPLEX_ACTIONS = [
  /部署/, /安装/, /配置/, /搭建/, /迁移/, /升级/, /优化/, /监控/,
  /备份/, /恢复/, /扩容/, /缩容/, /发布/, /回滚/,
  /deploy/i, /install/i, /setup/i, /configure/i, /migrate/i, /upgrade/i,
  /optimize/i, /monitor/i, /backup/i, /restore/i, /scale/i, /rollback/i,
  /provision/i, /bootstrap/i, /harden/i,
];

// Complex resource keywords (middleware, infrastructure, databases)
const COMPLEX_RESOURCES = [
  /mysql/i, /mariadb/i, /postgres/i, /postgresql/i, /mongodb/i, /redis/i,
  /elasticsearch/i, /kafka/i, /rabbitmq/i, /nats/i,
  /nginx/i, /apache/i, /haproxy/i, /traefik/i, /caddy/i,
  /docker/i, /kubernetes/i, /k8s/i, /containerd/i, /podman/i,
  /prometheus/i, /grafana/i, /alertmanager/i, /loki/i, /tempo/i,
  /jenkins/i, /gitlab/i, /github actions/i, /ansible/i, /terraform/i,
  /iptables/i, /nftables/i, /firewalld/i, /ufw/i,
  /ceph/i, /nfs/i, /samba/i,
  /systemd/i, /supervisor/i, /pm2/i,
];

// Context hints (indicating production/complex environments)
const COMPLEX_CONTEXT_HINTS = [
  /生产/i, /生产环境/i, /线上/i, /正式/i,
  /production/i, /prod\b/i, /live\b/i,
  /集群/i, /cluster/i,
  /高可用/i, /ha\b/i, /high availability/i,
  /灾备/i, /容灾/i, /主从/i, /主备/i,
  /canary/i, /blue.green/i, /灰度/,
  /微服务/i, /microservice/i,
  /安全/, /security/i, /加固/,
  /审计/, /compliance/i,
];

// Sequence patterns (CN/EN ordered steps)
const SEQUENCE_PATTERNS_CN = [
  /首先.*然后.*最后/,
  /第一步.*第二步.*第三步/,
  /先.*再.*最后/,
  /首先/,
  /然后/,
  /接着/,
  /最后/,
  /下一步/,
  /再/,
];

const SEQUENCE_PATTERNS_EN = [
  /first.*then.*finally/i,
  /first.*second.*third/i,
  /step\s*1.*step\s*2.*step\s*3/i,
  /first[\s,:]/i,
  /next[\s,:]/i,
  /then[\s,:]/i,
  /finally[\s,:]/i,
  /after that/i,
];

// Numbered lists
const NUMBERED_LIST = /(?:^|\n)\s*\d+[\.\)、]\s+/gm;

// Chinese enumerated lists
const CN_ENUM_LIST = /(?:^|\n)\s*[一二三四五六七八九十][、，]\s*/gm;

// Additional complexity signals
const COMPLEXITY_SIGNALS = [
  // Multiple actions
  /(.{10,}。.{10,}。.{10,})/,  // 3+ sentences in CN
  /(.{20,}\..{20,}\..{20,})/,  // 3+ sentences in EN
  // System diagnostics
  /排查/, /诊断/, /troubleshoot/i, /diagnose/i, /investigate/i,
  // Batch operations
  /批量/, /全部/, /所有/, /batch/i, /all\b/i, /every\b/i,
  // Log analysis
  /日志/, /log\b/i, /error/i, /报错/, /异常/,
  // Multi-server
  /多台/, /多节点/, /所有.*服务器/, /multiple.*server/i, /all.*node/i,
];

// ============================================================================
// Detection logic
// ============================================================================

/**
 * Check if the user message indicates a high-complexity intent
 * requiring structured task management.
 */
export function isHighComplexityIntent(message: string): boolean {
  let signals = 0;

  const hasComplexAction = COMPLEX_ACTIONS.some((r) => r.test(message));
  const hasComplexResource = COMPLEX_RESOURCES.some((r) => r.test(message));
  const hasComplexContext = COMPLEX_CONTEXT_HINTS.some((r) => r.test(message));

  if (hasComplexAction) signals++;
  if (hasComplexResource) signals++;
  if (hasComplexContext) signals++;

  // Combined presence = high complexity
  if ((hasComplexAction && hasComplexResource) ||
      (hasComplexResource && hasComplexContext) ||
      (hasComplexAction && hasComplexContext)) {
    return true;
  }

  return signals >= 3;
}

/**
 * Count explicit sequence steps in the message.
 */
function countSequenceSteps(message: string): number {
  // Numbered lists: "1. xxx  2. xxx  3. xxx"
  const numberedMatches = message.match(NUMBERED_LIST);
  if (numberedMatches && numberedMatches.length >= MIN_STEPS_FOR_TODO) {
    return numberedMatches.length;
  }

  // Chinese enumeration: "一、xxx  二、xxx  三、xxx"
  const cnEnumMatches = message.match(CN_ENUM_LIST);
  if (cnEnumMatches && cnEnumMatches.length >= MIN_STEPS_FOR_TODO) {
    return cnEnumMatches.length;
  }

  // CN sequence words
  let cnCount = 0;
  for (const p of SEQUENCE_PATTERNS_CN) {
    if (p.test(message)) cnCount++;
  }
  if (cnCount >= MIN_STEPS_FOR_TODO) return cnCount;

  // EN sequence words
  let enCount = 0;
  for (const p of SEQUENCE_PATTERNS_EN) {
    if (p.test(message)) enCount++;
  }
  if (enCount >= MIN_STEPS_FOR_TODO) return enCount;

  return 0;
}

/**
 * Count complexity signals (beyond sequence patterns).
 */
function countComplexitySignals(message: string): number {
  let count = 0;
  for (const signal of COMPLEXITY_SIGNALS) {
    if (signal.test(message)) {
      count++;
      if (count >= MIN_SIGNALS_FOR_COMPLEX) break;
    }
  }
  // Count actions and resources as signals too
  if (COMPLEX_ACTIONS.some((r) => r.test(message))) count++;
  if (COMPLEX_RESOURCES.some((r) => r.test(message))) count++;
  return count;
}

/**
 * Main detection function — should a todo list be created
 * for this user message?
 */
export function shouldCreateTodo(message: string): boolean {
  if (!message || message.length <= MIN_MESSAGE_LENGTH) {
    return false;
  }

  // Strong signal: high complexity intent
  if (isHighComplexityIntent(message)) {
    return true;
  }

  // Check for explicit sequence steps
  const stepCount = countSequenceSteps(message);
  if (stepCount >= MIN_STEPS_FOR_TODO) {
    return true;
  }

  // Check for multiple complexity signals
  const signalCount = countComplexitySignals(message);
  if (signalCount >= MIN_SIGNALS_FOR_COMPLEX && message.length > 40) {
    return true;
  }

  return false;
}

// ============================================================================
// System reminder fragments for todo creation
// ============================================================================

export const TODO_CREATION_REMINDER_CN = `
【system-reminder】用户的任务较为复杂。请在回复中先使用 todo_write 工具创建一个任务清单（每个任务包含 id/content/status/priority），然后将首个任务设为 in_progress 并立即开始执行。
`;

export const TODO_CREATION_REMINDER_EN = `
【system-reminder】The user's request is complex. Please use the todo_write tool to create a task list first. Set the first task to in_progress and begin execution immediately.
`;

export function getTodoCreationReminder(message: string): string | null {
  if (shouldCreateTodo(message)) {
    // Detect language
    const hasChinese = /[一-鿿]/.test(message);
    return hasChinese ? TODO_CREATION_REMINDER_CN : TODO_CREATION_REMINDER_EN;
  }
  return null;
}
