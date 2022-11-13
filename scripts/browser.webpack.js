import webpack from 'webpack'
import info from '../package.json' assert { type: 'json' }

/** @type {import('webpack').WebpackOptionsNormalized} */
export default {
  entry: './index.js',
  devtool: 'source-map',
  resolve: {
    aliasFields: ['browser'],
    alias: {
      ...info.browser,
      crypto: false,
      http: 'stream-http',
      https: 'stream-http',
      stream: 'stream-browserify',
      path: 'path-browserify'
    }
  },
  output: {
    chunkFormat: 'module',
    filename: 'webtorrent.min.js',
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
      process: '/lib/_process-fast.js',
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      global: 'globalThis'
    })
  ]
}
