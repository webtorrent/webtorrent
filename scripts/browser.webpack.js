import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import info from '../package.json' assert { type: 'json' }

/** @type {import('webpack').Configuration} */
export default {
  entry: './index.js',
  devtool: 'source-map',
  resolve: {
    aliasFields: ['browser'],
    alias: {
      ...info.browser,
      path: 'path-esm'
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
      process: '/polyfills/process-fast.js',
      createWritable: '/polyfills/create-writable.js'
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
