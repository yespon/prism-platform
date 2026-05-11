# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

**Preferred method**: Submit a report via GitHub Security Advisories:
https://github.com/opsintech/opsintech-platform/security

**Alternative**: Send an email to the project maintainers if GitHub Security Advisories is not suitable for your situation.

Please include the following in your report:
- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any suggested mitigations or fixes

**What to expect**:
- We will acknowledge your report within 48 hours
- We will provide an initial assessment within 5 business days
- We will keep you informed of progress throughout the resolution process
- We will credit responsible disclosure in our release notes (unless you prefer to remain anonymous)

**Please do not**:
- Publicly disclose the vulnerability before a fix is available
- Access or modify data that does not belong to you
- Use automated vulnerability scanners that may degrade service availability

## Supported Versions

| Version | Supported |
| ------- | --------- |
| v1.0 (main branch) | Yes |
| Pre-release / development builds | Best-effort |

As OpsinTech is in its initial release phase, please use the latest version from the `main` branch for security updates. Once stable releases are published, we will provide security patches for the latest minor version.

## Security Features

OpsinTech v1.0 includes the following security capabilities:
- Multi-tenancy with strict data isolation between tenants
- Role-based access control (RBAC) with platform and tenant admin roles
- Full audit trail for all administrative and user operations
- Mandatory password change on first login
- User status management (active / suspended)
- Sandboxed code execution with configurable isolation levels
