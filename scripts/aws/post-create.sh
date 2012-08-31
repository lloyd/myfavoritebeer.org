#!/bin/bash

# Mongo is in a special repo
echo "Installing MongoDB..."

echo "[10gen]
name=10gen Repository
baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64
gpgcheck=0" | sudo tee -a /etc/yum.repos.d/10gen.repo


# install mongo
sudo yum -y install mongo-10gen-server
sudo yum -y install sysstat

# create data directories
sudo mkdir /data
sudo mkdir /data/db

# set up permissions so mongod can write to data
sudo chown -R mongod:mongod /data

echo "Starting MongoDB... This might take a while"
sudo /etc/init.d/mongod start

echo "Configuring Database Users..."
sudo mongo 127.0.0.1:27017/myfavoritebeer --eval "db.addUser('beer', 'thisismyfavoritebeer');"

