# MoteRunnerStack
MoteRunnerStack is a IEEE 802.11.4-like MAC layer based on IBM MoteRunner v.13.

It makes possible to create a star topology with a PAN coordinator and one or more motes associated with it.

The MAC layer works in beacon enabled + superframe mode with CSMA/CA access method to each slot time.
The contention based access method permits to network with low data-rate to communicate without excessive waiting time.

Motes behaviour is described inside MAC. Actually there are three behaviour: Coordinator, Associated and Unassociated.

Coordinator defines the superframe emitting beacons and superframe specifications, receives commands and gets back response to associated motes. And it receives and sends data from/to associated motes.

Associated behaviour transmits data to PAN coordinator and asks for data in an indirect way. That is the coordinator sends a list of address inside the beacon meaning wich mote has pending data. Then the mote sends a request for that data and the coordinator sends it back.

Unassociated motes listen for beacon. Once a beacon has been received, the mote sends an association request to PAN coordinator and handles the future message handshake with it.
