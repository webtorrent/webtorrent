import arrayRemove from 'unordered-array-remove'
import Debug from 'debug'
import natUpnp from 'nat-upnp' // browser exclude
import natpmp from 'nat-pmp' // browser exclude
import defaultGateway from 'default-gateway' // browser exclude
import queueMicrotask from 'queue-microtask'

const debug = Debug('webtorrent:nat-traversal')

const p = (fn, ...args) => new Promise(resolve => fn(...args, resolve))

class NatTraversal {
  constructor () {
    this._destroyed = false

    // The RECOMMENDED Port Mapping Lifetime is 7200 seconds (two hours).
    this.ttl = 7200
    // Refresh the mapping 10 minutes before the end of its lifetime
    this.timeout = (this.ttl - 600) * 1000
    this._openedPorts = []
    this._intervalsUpnp = {}
    this._intervalsPmp = {}

    debug('UPnP client creation')
    this._upnpClient = natUpnp.createClient()

    debug('Lookup gateway IP')
    // Lookup gateway IP
    defaultGateway.v4.then(({ gateway }) => {
      if (gateway) {
        this._pmpInit(gateway)
      } else {
        defaultGateway.v6.then(({ gateway }) => {
          if (gateway) {
            this._pmpInit(gateway)
          } else {
            debug('Could not find gateway IP for NAT-PMP')
          }
        })
      }
    })
  }

  _pmpInit (gateway) {
    debug('NAT-PMP client creation', gateway)
    this._pmpClient = natpmp.connect(gateway)
    for (const { port, protocol } of this._openedPorts) {
      this._pmpPortMapping(port, protocol)
    }
  }

  async _upnpPortMapping (port, protocol) {
    debug('Mapping port %d for protocol %s on router using UPnP', port, protocol)
    const err = await p(this._upnpClient.portMapping, {
      public: port,
      private: port,
      description: 'WebTorrent',
      protocol,
      ttl: this.ttl
    })

    if (this._destroyed || err) return err
    this._intervalsUpnp[port] = setInterval(() => this._pmpPortMapping(port, protocol), this.timeout).unref?.()
    debug('Port %d for protocol %s mapped on router using UPnP', port, protocol)
  }

  async _pmpPortMapping (port, protocol) {
    debug('Mapping port %d for protocol %s on router using NAT-PMP', port, protocol)
    const err = await p(this._pmpClient.portMapping, {
      private: port,
      public: port,
      ttl: this.ttl,
      type: protocol
    })
    if (this._destroyed || err) return err

    this._intervalsPmp[port] = setInterval(() => this._pmpPortMapping(port, protocol), this.timeout).unref?.()
    debug('Port %d for protocol %s mapped on router using NAT-PMP', port, protocol)
  }

  async portMapping (port, protocol = 'tcp') {
    if (this._destroyed) return

    this._openedPorts.push({ port, protocol })

    // Try UPnP first
    const errU = await this._upnpPortMapping(port, protocol)
    if (this._destroyed) return
    if (errU) debug('UPnP port mapping failed on %d', port, errU.message)

    if (!this._pmpClient) return

    // Then NAT-PMP
    const errN = await this._pmpPortMapping(port, protocol)
    if (errN) debug('NAT-PMP port mapping failed on %d', port, errN.message)
  }

  async portUnMapping (port) {
    if (this._destroyed) return
    arrayRemove(this._openedPorts, this._openedPorts.findIndex(o => o.port === port))

    // Clear intervals
    if (this._intervalsUpnp[port]) {
      clearInterval(this._intervalsUpnp[port])
      delete this._intervalsUpnp[port]
    }
    if (this._intervalsPmp[port]) {
      clearInterval(this._intervalsPmp[port])
      delete this._intervalsPmp[port]
    }

    debug('Unmapping port %d on router using UPnP', port)
    const errU = await p(this._upnpClient.portUnmapping, { public: port })

    if (!errU) debug('Port %d unmapped on router using UPnP', port)

    if (!this._pmpClient) return

    debug('Unmapping port %d on router using NAT-PMP', port)
    const errN = await p(this._pmpClient.portUnmapping, { private: port, public: port })

    if (!errN) debug('Port %d unmapped on router using NAT-PMP', port)
  }

  destroy () {
    if (this._destroyed) return
    this._destroyed = true

    // Unmap all ports
    for (const { port } of this._openedPorts) {
      this.portUnMapping(port)
    }

    if (this._pmpClient) {
      debug('Close pmp client')
      this._pmpClient.close()
    }

    // Waiting next tick to prevent breaking some sockets
    queueMicrotask(() => {
      debug('Close UPnP client')
      this._upnpClient.close()
    })
  }
}

export default new NatTraversal()
