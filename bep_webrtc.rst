:BEP: XXX
:Title: Websocket tracker protocol for WebRTC transport
:Version: $Revision$
:Last-Modified: $Date$
:Author:  Yoann Ciabaud <y.ciabaud@gmail.com>
:Status:  Draft
:Type:    Standards Track
:Content-Type: text/x-rst
:Created: 02-Aug-2016
:Post-History:


Abstract
========
Webapps are more and more used to publish and consume content over the
internet, Bittorrent could be used to optimize the server and network resources
needed to distribute files but the need for a client software prevents its
usage in a browser environment.

This BEP documents how to add support for WebRTC signalling on a tracker in
order to make the webapps able to connect peers using the WebRTC API [1].
Once a communication channel is open between the peers using WebRTC, the
standard Bittorent peer connection protocol is used.

Due to the WebRTC signalling process, the tracker needs to push messages to the
clients with a full-duplex communication channel available in a web browser.
At the moment of this BEP, Websockets [2] are the only compatible standard
technology.

WebRTC signalling process
=========================
The diagram below explains the messages involved in the WebRTC signalling
process.

::

  peer 1                 tracker                  peer 2

    |                       |                       |
    |                       |                       |
    | announce start        |                       |
    |   numwant=x           |                       |
    |   x SDP offers        |                       |
    | >-------------------> |                       |
    |                       |                       |
    |                       |  SDP offer            |
    |                       | >-------------------> |
    |                       |                       |
    |                       |  SDP answer           |
    |                       | <-------------------< |
    |                       |                       |
    |  SDP answer           |                       |
    | <-------------------< |                       |
    |                       |                       | connection established
   .|.. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..|.. .
    |                                               |
    V                                               V

Websocket tracker protocol
==========================

credits
-------
The websocket tracker protocol has been designed for the Webtorrent [3] project
by Feross Aboukhadijeh and hundreds of open source contributors.

overview
--------
The websocket tracker uses JSON payloads reflecting the HTTP request parameters
and an additionnal action property used to switch between announce and other
actions (ex. scrape). If the announce URL of the torrent contains the ws or wss
protocol, the client establishes a websocket connection with the tracker.

WebRTC offers and answers can be provided as an extension of the announce
message, the tracker will be responsible to forward them between the peers to
act as a signalling service.

After the connection is open, the client can begin announcing itself by using
the JSON messages below.

signalling related message format
---------------------------------
announce request::

  {
    "action":     "announce",
    "info_hash":  "",
    "peer_id":    ""
    "numwant":    0,
    "uploaded":   0,
    "downloaded": 0,
    "left":       0,
    "event":      "",
    "offers":     [
      {
        "offer_id": "",
        "offer": ""
      },
      ...
    ]
  }

A client can provide SDP offers that the tracker will forward to peers to
establish a connection.
"offers" is a JSON array containing a list of WebRTC SDP offers and a generated
"offer_id" used to match peers and offers.


announce response::

  {
    "action":     "announce",
    "complete":   0,
    "incomplete": 0,
    "interval":   0,
    "info_hash":  ""
  }


offer or answer message::

  {
    "action":     "announce",
    "info_hash":  "",
    "offer_id":   "",
    "peer_id":    "",
    "sdp":      ""
  }

The tracker forwards the offer or the answer to clients in an announce message
with an "sdp" property.


answer message::

  {
    "action":     "announce",
    "info_hash":  "",
    "offer_id":   "",
    "peer_id":    "",
    "to_peer_id":    "",
    "answer":     ""
  }

A client can answer to an offer by sending the data in an announce message with
an "answer" property?


other message format
--------------------

scrape request::

  {
    "action":     "scrape",
    "info_hash":  ""
  }


scrape response::

  {
    "announce": "",
    "info_hash": "",
    "complete": 0,
    "incomplete": 0,
    "downloaded": 0
  }


multi-scrape request::

  {
    "action":     "scrape",
    "info_hash":  ["ih1", "ih2", ...]
  }


multi-scrape response::

  {
    "ih1": {
      "announce": "",
      "info_hash": "ih1",
      "complete": 0,
      "incomplete": 0,
      "downloaded": 0
    },
    "ih2":
    {
      "announce":   "",
      "info_hash":  "ih2",
      "complete":   0,
      "incomplete": 0,
      "downloaded": 0
    }
  }


If the tracker encounters an error, it might send an error message.

error response::

  {
    "error": ""
  }


Existing implementations
========================

bittorrent-tracker [4] support this protocol, it is used in all WebTorrent [2]
clients.


Extensions
==========

JSON format is extensible, therefore a client or a tracker can add data to the
message structure. This way, additional fields can be added without breaking
compatibility.

References and Footnotes
========================

.. [1] https://www.w3.org/TR/webrtc/
.. [2] https://tools.ietf.org/html/rfc6455
.. [3] https://webtorrent.io
.. [4] https://github.com/feross/bittorrent-tracker


..
   Local Variables:
   mode: indented-text
   indent-tabs-mode: nil
   sentence-end-double-space: t
   fill-column: 70
   coding: utf-8
   End:
