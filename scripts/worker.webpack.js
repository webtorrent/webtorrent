/** @type {import('webpack').Configuration} */
export default {
  entry: './lib/worker.js',
  devtool: 'source-map',
  output: {
    filename: 'sw.min.js'
  },
  mode: 'production',
  target: 'web'
}
