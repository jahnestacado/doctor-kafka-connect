# Doctor Kafka Connect

Doctor Kafka Connect is a healthcheck service for Kafka Connect clusters.

## Motivation

Apparently the Kafka Connect connector tasks can end up in unrecoverable state and they have to be restarted manually. This behavior is not suitable for production so if we need a self healing Kafka Connect cluster we need an automated way of handling this. Moreover, the Kafka Connect REST API doesn't provide a worker specific status endpoint. You can only get an overview of the status of tasks for a specific connector for the whole cluster. Doctor Kafka Connect is build in order to be used as a sidecar of each Kafka Connect worker which exposes two healthcheck endpoint for assessing the health of tasks of a specific connector in that specific worker node or assessing the health of all running tasks in a specific worker.

## Docker image

```
jahnestacado/doctor-kafka-connect:1.1.1
```

## Environment variables

#### LOG_LEVEL

The log level of Doctor Kafka Connect service

| LOG_LEVEL        |                                     |
| ---------------- | ----------------------------------- |
| Available levels | `[TRACE\|DEBUG\|INFO\|WARN\|ERROR]` |
| Default Value    | `INFO`                              |

#### KAFKA_CONNECT_HOSTNAME

The hostname or ip address of the targeted Kafka Connect Worker

| KAFKA_CONNECT_HOSTNAME |             |
| ---------------------- | ----------- |
| Default Value          | `localhost` |

#### KAFKA_CONNECT_PORT

The port where the Kafka Connect REST Endpoint is running.  
Equivalent to the CONNECT_REST_ADVERTISED_PORT value of the worker node

| KAFKA_CONNECT_PORT |             |
| ------------------ | ----------- |
| Default Value      | `localhost` |

#### HEALTHCHECK_PORT

The port where the Doctor Kafka Connect service will listen

| HEALTHCHECK_PORT |         |
| ---------------- | ------- |
| Default Value    | `18083` |

#### KAFKA_CONNECT_TARGET_WORKER_IDS

The Kafka Connect Workers that we want to monitor their status. This property is only required when the Doctor Kafka Connect service is not running on the same host/pod with the targeted Kafka Connect worker.  
 The expected format of the value is comma separated strings. Most of the times a single entry will be required e.g `kafka-connect-worker-1:8083`

| KAFKA_CONNECT_TARGET_WORKER_IDS |     |
| ------------------------------- | --- |
| Default Value                   | ``  |

## REST API

---

### `GET /healthcheck`

Get the overall health status of all the tasks that run on the targeted Kafka Connect worker.

**Format**  
`http://hostname:${HEALTHCHECK_PORT}/healthcheck`

**Example Request**

```bash
curl http://localhost:18083/healthcheck
```

**Healthy Response example**

Status 200

```json
{
    "failures": []
}
```

**Unhealthy Response example**

Status 503

```json
{
    "failures": [
      { "connector":"connector-1", "taskId": 0, "workerId": "kafka-connect-worker-0:8083", "trace": "the stack trace..." },
      { "connector":"connector-2", "taskId": 3, "workerId": "kafka-connect-worker-0:8083", "trace": "the stack trace..." },
      ...
    ]
}
```

---

### `GET /healthcheck/:connector-name`

Get the current health status of all the tasks of the targeted connector that runs in the targeted Kafka Connect worker.

**Format**
`http://hostname:${HEALTHCHECK_PORT}/healthcheck/:connector-name`

**Example Request**

```bash
curl http://localhost:18083/healthcheck/my-s3-connector
```

**Healthy Response example**

Status 200

```json
{
    "failures": []
}
```

**Unhealthy Response example**

Status 503

```json
{
    "failures": [
      { "connector":"connector-name", "taskId": 0, "workerId": "kafka-connect-worker-0:8083", "trace": "the stack trace..."},
      ...
    ]
}
```

---

## Kubernetes example

```
- kind: DeploymentConfig
  apiVersion: v1
  metadata:
    name: kafka-connect
  spec:
    template:
      metadata:
        labels:
          name: "kafka-connect"
      spec:
        containers:
          - name: "kafka-connect-worker"
            image: confluentinc/cp-kafka:5.0.0
            env:
              - { name: "CONNECT_REST_ADVERTISED_PORT", value: "8083" }
              - { name: "CONNECT_REST_PORT", value: "8083" }

            # ...rest of Kafka Connect specific env vars

            ports:
              - containerPort: 8083
                protocol: TCP
            livenessProbe:
              httpGet:
                path: /healthcheck
                port: 18083
              initialDelaySeconds: 60
              timeoutSeconds: 15
              periodSeconds: 30
          - name: "doctor-kafka-connect"
            image: jahnestacado/doctor-kafka-connect:1.1.1
            ports:
              - { containerPort: 18083, name: "healthcheck", protocol: TCP }
            env:
              - { name: LOG_LEVEL, value: "DEBUG" }
    replicas: 5
    ...
```

## Docker Swarm example

```
version: "3"
services:

  kafka-connect-worker-0:
    image: confluentinc/cp-kafka-connect:5.3.0
    ports:
      - "8083:8083"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://doctor-kafka-connect-0:18083/healthcheck"]
      interval: 1m30s
      timeout: 10s
      retries: 3
    environment:
      CONNECT_REST_ADVERTISED_HOST_NAME: kafka-connect-worker-0
      CONNECT_REST_ADVERTISED_PORT: 8083
      CONNECT_REST_PORT: 8083
      # ...rest of Kafka Connect specific env vars

  doctor-kafka-connect-0:
    image: jahnestacado/doctor-kafka-connect:1.1.1
    ports:
      - "18083:18083"
    environment:
      LOG_LEVEL: DEBUG
      KAFKA_CONNECT_HOSTNAME: kafka-connect-worker-0
      KAFKA_CONNECT_PORT: 8083
      HEALTHCHECK_PORT: 18083
      KAFKA_CONNECT_TARGET_WORKER_IDS: kafka-connect-worker-0:8083

  kafka-connect-worker-1:
    image: confluentinc/cp-kafka-connect:5.3.0
    ports:
      - "8083:8083"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://doctor-kafka-connect-1:18084/healthcheck"]
      interval: 1m30s
      timeout: 10s
      retries: 3
    environment:
      CONNECT_REST_ADVERTISED_HOSTNAME: kafka-connect-worker-1
      CONNECT_REST_ADVERTISED_PORT: 8084
      CONNECT_REST_PORT: 8084
      # ...rest of Kafka Connect specific env vars

  doctor-kafka-connect-1:
    image: jahnestacado/doctor-kafka-connect:1.1.1
    ports:
    - "18084:18084"
    environment:
      LOG_LEVEL: DEBUG
      KAFKA_CONNECT_HOSTNAME: kafka-connect-worker-1
      KAFKA_CONNECT_PORT: 8084
      HEALTHCHECK_PORT: 18084
      KAFKA_CONNECT_TARGET_WORKER_IDS: kafka-connect-worker-1:8084


```
