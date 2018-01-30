# ge-app

## App setup

Install npm and bower dependencies 
```
yarn install && bower install
```

To customize the application name do a global search and
replace of `ge__app` and `ge_app__title`.

`ge__app` is the name used in `package.json`, `bower.json` and
other internal files.

`ge_app__title` is the name used in user-facing files like `public/_index.html`.

## Development

You must install chrome "enable liveReload" extension for the livereload to work properly https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei?hl=en

## Mock Data

The node application is able to record and mock /api endpoints responses.

Run **gulp --mock** in order to enable the mock proxy.

Update **mock-config.json** in order to configure which /api endpoint will be mocked.
 
Each service has its own configuration in the mock config file : the service name has to be added as a property and the 
service mock mode as its value.

There are several possible mock modes:
- "record" : to record the response of the real service in a local json file
- "mock" : to mock the response using the json file recorded previously
- "mockrecord" : to mock the existing records and record the non-existing ones

In record mode, use your client (ui, postman, ...) in order to send all the required requests
to your node reverse proxy and record the corresponding mocks.

Current limitations :
- Corporate proxies are not managed for recording (no bluesso)

## Install Redis locally

### Install docker for mac : 
https://docs.docker.com/docker-for-mac/install/
### Start docker app
### Download redis image (using 'Internet' wifi): 

docker pull redis
### Create and start redis container :

docker container run -p 6379:6379 --name local-redis -d redis
### If docker is restarted, the container has to be manually started :

docker ps -a
docker start <container id>