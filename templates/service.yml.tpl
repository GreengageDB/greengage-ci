  $SERVICE:
    image: $IMAGE
    hostname: $SERVICE
    privileged: true
    working_dir: /home/gpadmin
    volumes:
      - ./$SSH_KEYS/id_rsa:/home/gpadmin/.ssh/id_rsa
      - ./$SSH_KEYS/id_rsa.pub:/home/gpadmin/.ssh/id_rsa.pub
      - ./$LOG_DIR/$SERVICE:/$LOG_DIR"
    sysctls:
      kernel.sem: 500 1024000 200 4096
    init: true
    entrypoint: >
      sleep infinity
