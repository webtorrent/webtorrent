### Description of Improvements

We want to add pause and resume feature to a torrent's upload/download progress and we want to add a feature that allows user to enable/disable seeding. We also want to add pause/resume feature to CLI so that user can pause, resume and quit torrent from command line.

This is a big PR, so let me just list out everything that I've changed/added

### Description of Changes

#### Torrent.js
1. Added pause() & resume() for active torrents 
    - pauses and resumes the current torrent
2. Added disableSeeding() and enableSeeding()
    - enables or disables autoseeding 

#### Index.js
1. Added pause() & resume() 
   - pauses and resumes a client's torrent (calls Torrent.pause/resume)

#### bin/cmd.js
1. Added CLI menu to quit, resume and pause while seeding or downloading a torrent

### New Testing 

#### test/browserAppendTo
1. Added a browser-based video streaming test for AppendTO

#### test/Resume-Torrent-Scenarios
1. Added 5 scenario-based test cases for pause and resume (resume-torrent-scenarios.js)

#### Torrent.js
1. Added unit tests for private functions in Torrent.js

I also added __coveralls__ support and code coverage with __istanbul__ if you choose to use it and I fixed formatting errors in the .travis.yml.
