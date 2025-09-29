@echo off 
docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest 
