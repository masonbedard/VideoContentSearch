#VideoContentSearch
##Set Up
####Open up terminal to run the following commands.
####Install latest version of Homebrew.
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    brew update
####Use Homebrew to install Node.
    brew install node
####Within your desired directory, clone this repo.
    git clone https://github.com/masonbedard/VideoContentSearch.git
####Within root of cloned project, install the necessary dependencies for this project.
    npm install
####Open up Chrome and navigate to chrome://extensions, and then drag and drop into this page the directory in which you cloned the repo.
####Return to terminal and start the server from the root of the directory.
    node server.js
##Development
####If modifying code that runs in the extension, run the following from the root of the directory and reopen the extension.
    ./node_modules/.bin/gulp
####If modifying code that is only run on the server, just rerun the command to start the server from above.
    node server.js

