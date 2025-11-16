#!/bin/sh
exec curl -u lnks:N5JKpyiw97zhrY0U -LJ "https://hlogs.lazycat.cloud/api/v1/download-log/$1" -o "${1}.zip"
