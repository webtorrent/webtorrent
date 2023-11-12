import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import info from '../package.json' assert { type: 'json' }

/** @type {import('webpack').Configuration} */
export default {
  entry: './index.js',
  devtool: 'source-map',
  resolve: {
    aliasFields: ['chromeapp'],
    alias: {
      ...info.chromeapp,
      path: 'path-esm',
      stream: 'stream-browserify',
      timers: 'timers-browserify',
      crypto: 'crypto-browserify',
      buffer: 'buffer',
      querystring: 'querystring',
      zlib: '/polyfills/inflate-sync-web.js'
    }
  },
  output: {
    chunkFormat: 'module',
    filename: 'webtorrent.chromeapp.js',
    library: {
      type: 'module'
    }
  },
  mode: 'production',
  target: 'web',
  experiments: {
    outputModule: true
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: '/polyfills/process-fast.js',
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      global: 'globalThis'
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        format: {
          comments: false
        }
      },
      extractComments: false
    })]
  }
}
