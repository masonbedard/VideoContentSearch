#VideoContentSearch
##Setting up for development on a Mac using Homebrew
####Open up terminal
####Install latest version of Homebrew
    ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    brew update
###Use Homebrew to install node
    brew install node
####Within your desired directory, clone this repo
    git clone https://github.com/masonbedard/VideoContentSearch.git
####Install the necessary dependencies for this project
    npm install
####Open up Chrome and navigate to chrome://extensions, and then drag and drop into this page the directory in which you cloned the repo into
####Return to terminal and start the server
    node server.js

