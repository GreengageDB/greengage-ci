  $SERVICE:
    image: $IMAGE
    hostname: $SERVICE
    privileged: true
    working_dir: /home/gpadmin
    volumes:
      - $SSH_KEYS:/home/gpadmin/.ssh"
      - $LOG_DIR:$LOG_DIR"
    sysctls:
      kernel.sem: 500 1024000 200 4096
    init: true
    entrypoint: >
      sleep infinity
