# Cloud, infrastructure and deployment

## Look for

- **Exposure**: storage buckets, databases, queues and dashboards open to the internet, `0.0.0.0/0` rules for admin ports, public IPs on internal services.
- **Over-broad identity**: wildcard actions or resources in policies, `Owner` or admin roles for applications, shared credentials, no separation between environments.
- **Missing encryption** at rest or in transit where the data is sensitive.
- **Container and Kubernetes**: privileged containers, `hostPath` mounts, running as root, no resource limits, secrets in environment variables or images, default service accounts with rights.
- **Debug and development settings in production**: debug servers, verbose errors, sample admin accounts, development bind addresses.
- **Logging and monitoring gaps**: no audit logs on privileged actions.
- **Network**: no segmentation, internal services reachable from the edge.

## Prove it

Show the resource, the setting, and who can reach it. Check whether another file overrides the setting for production.

## Not a finding

Settings that are only in a local development file clearly kept apart from production.
