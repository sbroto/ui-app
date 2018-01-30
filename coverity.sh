#!/bin/sh -x

# Coverity script for Jenkins

# usage:
# ./coverity.sh "<coverity stream name>"

status=0

ui_path=${WORKSPACE}

#security
## to be removed before delivery to customer
token=06257b3aa41c2d6c92d69adf643dc7b650fd1bbd

#coverity client
coverity_bin=/opt/cov-analysis-linux64-8.5.0.5/bin

#coverity server
coverity_cred=$(curl -H "Authorization: token $token" -H "Accept: application/vnd.github.v3.raw" -L https://github.build.ge.com/api/v3/repos/GE-Digital-Foundry-Europe/credentials/contents/coverity.json)
coverity_srv=$(echo ${coverity_cred} | jq -r ".covserver")
coverity_port=8443
coverity_user=$(echo ${coverity_cred} | jq -r ".covuser")
coverity_pwd=$(echo ${coverity_cred} | jq -r ".covpassword")

#coverity stream
coverity_stream=$1

#run analysis
mkdir -p covtemp

${coverity_bin}/cov-configure --config coverity_js_config.xml --javascript
status=$?
if [ ${status} -ne 0 ]; then
	exit ${status}
fi

${coverity_bin}/cov-build --config coverity_js_config.xml --dir covtemp --no-command --fs-capture-search "${ui_path}" --fs-capture-search-exclude-regex '[/\\]dist$' --fs-capture-search-exclude-regex '[/\\]bower_components$' --fs-capture-search-exclude-regex '[/\\]node_modules$' --fs-capture-search-exclude-regex '[/\\]covtemp$'
status=$?
if [ ${status} -ne 0 ]; then
	exit ${status}
fi

${coverity_bin}/cov-analyze --config coverity_js_config.xml --dir covtemp
status=$?
if [ ${status} -ne 0 ]; then
	exit ${status}
fi

${coverity_bin}/cov-commit-defects --dir covtemp --host "${coverity_srv}" --https-port "${coverity_port}" --stream "${coverity_stream}" --user "${coverity_user}" --password "${coverity_pwd}"
status=$?
if [ ${status} -ne 0 ]; then
	exit ${status}
fi

exit ${status}
