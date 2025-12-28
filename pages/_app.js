import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>Gift Card Balance Checker</title>
        <meta name="description" content="Check your gift card balance instantly for Apple, Steam, and more." />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
