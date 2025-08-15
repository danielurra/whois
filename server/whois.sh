#!/bin/sh

if [ -z "$1" ]; then
    echo "No IP address provided"
    exit 1
fi

whois "$1" | grep -i 'OrgName\|Organization' | sed 's/.*Organization[[:space:]]*:[[:space:]]*//I; s/.*OrgName[[:space:]]*:[[:space:]]*//I' | sort | uniq