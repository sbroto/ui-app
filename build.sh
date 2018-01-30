#!/bin/sh -x

# Build script for Jenkins

# usage for a job triggered by a pull request:
# ./build.sh ${BUILD_NUMBER} "build"

# usage for a job triggered by a commit on master branch:
# ./build.sh ${BUILD_NUMBER} "artifactory"

start=`date +%s`

#export http_proxy=http://sjc1intproxy01.crd.ge.com:8080
#export https_proxy=$http_proxy

rm -rf node_modules

git config --global credential.helper d436e038f259fc68f613971a63132541fe07018b

buildNumber=$1
mode=$2

tags=$(git describe --tags)
checkTag=$(git describe --exact-match HEAD)
status=0

export ci_build_appname=$( basename `git remote show -n origin | grep Fetch | cut -d: -f2- | sed 's/\.git//g'` )

export ci_build_tag=${tags}

if [ ${buildNumber} ]; then
    export ci_build_number=${buildNumber}

    if [ ${checkTag} ]; then
      export ci_build_mode="RELEASE"
    else
      export ci_build_mode="SNAPSHOT"
    fi
else
    export ci_build_number="-1"
fi

export ci_build_id=${ci_build_tag}-${ci_build_number}

npm config set registry https://repo.jenkins.build.ge.com/artifactory/api/npm/npm-virtual

#download and install dependencies
yarn install
status=$?
if [[ ${status} -ne 0 ]]; then
	exit ${status}
fi

bower --allow-root install
status=$?
if [[ ${status} -ne 0 ]]; then
	exit ${status}
fi

yarn test-node
status=$?
if [[ ${status} -ne 0 ]]; then
	exit ${status}
fi

#wcf test disabled, waiting for a docker image with embedded browser
#yarn test-ui
status=$?
if [[ ${status} -ne 0 ]]; then
	exit ${status}
fi

#in case of commit on master branch, build and publish to artifactory
if [ "$mode" = "artifactory" ]; then
	gulp deploy
	status=$?
	echo ${status}
	if [[ ${status} -ne 0 ]]; then
		exit ${status}
	fi

	echo "APP_BUILD_ID=${ci_build_id}" > "./newBuild.properties"
fi

#in case of pullrequest, build
if [ "$mode" = "build" ]; then
	gulp dist
	status=$?
	echo ${status}
	if [[ ${status} -ne 0 ]]; then
		exit ${status}
	fi
fi

end=`date +%s`

runtime=$((end-start))

echo "Build time : ${runtime} sec !!!"

exit ${status}
