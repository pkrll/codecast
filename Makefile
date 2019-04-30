.PHONY: docker

FLAGS=

start:
	docker-compose $(FLAGS) up

dev: start

prod: FLAGS+=-f docker-compose-prod.yml
prod: start

rebuild:
	docker-compose build

bash:
	sudo docker exec -i -t codecast_codecast_1 /bin/bash
