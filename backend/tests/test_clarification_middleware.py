from deerflow.agents.middlewares.clarification_middleware import ClarificationMiddleware


def test_format_clarification_message_normalizes_fragmented_options():
    middleware = ClarificationMiddleware()

    message = middleware._format_clarification_message(
        {
            "question": "我应该用什么方式连接到 Kubernetes 集群进行检查？",
            "clarification_type": "approach_choice",
            "context": "需要先确认连接方式",
            "options": [
                "通\n过\n已\n有\n的\nk\nu\nb\ne\nc\no\nn\nf\ni\ng\n文\n件\n连\n接",
                "通\n过\nS\nk\ny\nW\na\nl\nk\ni\nn\ng\n/\nE\nl\na\ns\nt\ni\nc\ns\ne\na\nr\nc\nh\n等\n接\n口\n间\n接\n判\n断",
            ],
        }
    )

    assert "1. 通过已有的kubeconfig文件连接" in message
    assert "2. 通过SkyWalking/Elasticsearch等接口间接判断" in message


def test_normalize_options_accepts_json_array_string():
    middleware = ClarificationMiddleware()

    options = middleware._normalize_options('["方案A", "方案B"]')

    assert options == ["方案A", "方案B"]
