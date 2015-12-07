#Webtorrent User Story 1 -- Resume/Pause:
As a user, I want to be able to pause my torrent while seeding or downloading and be able to resume progress after pausing my torrent.

#Webtorrent User Story 2 -- Search:
As a user, I want to be able to find and download a torrent by searching torrents online.

####Scenario S1.1: After I have created a new Torrent, and it has started downloading,
When I call the pause() function
Then my torrent will pause 
And then my torrent will stop downloading

####Scenario S1.2: After I have created a new Torrent, 
And I have paused my torrent
When I call the resume() function
Then my torrent will resume downloading 
And my torrent will pick up progress from last pause

####Scenario S1.3: After I have created a new Torrent,
And it has started downloading,
When I call the resume() function,
Then my RESUME will not execute

####Scenario S1.4: After I have created a new Torrent, 
And it has been paused
When I call the pause() function,
Then my PAUSE will not execute,
And my Torrent will still be paused

####Scenario S1.5: After I have created a new Torrent, 
And I have started downloading it ,
And my torrent has finished downloading
When I call the pause() function,
Then my PAUSE will not execute

####Scenario S2.1: After I have started the program,
When I call the search() function with a valid QUERY string
And there is at least one match for my QUERY string
Then it will return a torrent that is the first result in search query
And then it will start downloading the returned torrent

####Scenario S2.2: After I have started the program,
When I call the search() function with an invalid QUERY string
Then it will throw an error no torrent will be downloaded

####Scenario S2.3: After I have started the program,
When I call the search() function with a valid QUERY string
And there are no matches for my QUERY string
Then it will throw an error no torrent will be downloaded