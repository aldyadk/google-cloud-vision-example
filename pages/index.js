import Head from 'next/head'
import styles from '../styles/Home.module.css'
import axios from 'axios'
import { useState } from 'react'

export default function Home() {
  const [cvData, setCvData] = useState('')
  const [cvJSONData, setCvJSONData] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isImage, setIsImage] = useState(false)

  const handleFileChange = () => {
    setIsLoading(true)
    const file = document.getElementById('test-input').files[0]
    if (!file) {
      setIsLoading(false)
      return
    }
    if (file.type !== "application/pdf") {
      setIsImage(true)
      let reader = new FileReader()
      reader.readAsDataURL(file)
      const img = document.getElementById('test-img')
      reader.onloadend = () => {
        img.src = reader.result
        getCVData(reader.result)
      }
      reader.onerror = (err) => {
        setIsLoading(false)
        console.log(err)
      }
    } else if(file.type === "application/pdf"){
      setIsImage(false)
      const formData = new FormData();
      formData.append('pdf-file',file)
      axios.post(
        '/api/handlePDF',
        formData,
        {
          headers: { 'content-type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            console.log(`Current progress:`, Math.round((event.loaded * 100) / event.total));
          }
        },
      )
        .then(({data:{result}}) => {
          setIsLoading(false)
          const text = result.join('\n')
          const jsondata = '\nJSON ga dikirim, berat soalnya'
          setCvData(text)
          setCvJSONData(jsondata)
          setIsLoading(false)
        })
        .catch(err => {
          setIsLoading(false)
          console.log(err)
        })
    } else {
      document.getElementById('test-input').files = []
      setIsImage(false)
    }
  }

  function getCVData(b64) {
    b64 = b64.replace('data:image/jpeg;base64,', ''); // remove content type
    b64 = b64.replace('data:image/jpg;base64,', ''); // remove content type
    b64 = b64.replace('data:image/png;base64,', ''); // remove content type

    const request = {
      "requests": [
        {
          "image": { "content": b64 },
          "features": [
            {
              "type": "TEXT_DETECTION",
            }
          ]
        }
      ]
    };

    axios
      .post(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.CV_API_KEY}`, request)
      .then(({ data: { responses } }) => {
        if (!responses[0].fullTextAnnotation) {
          setCvData('no text')
          setCvJSONData('no text')
          setIsLoading(false)
          return
        }
        const text = responses[0].fullTextAnnotation.text
        const jsondata = JSON.stringify(responses[0].textAnnotations, null, 2)
        setCvData(text)
        setCvJSONData(jsondata)
        setIsLoading(false)
      })
      .catch(err => {
        setIsLoading(false)
        console.log(err)
      })

  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        <img id="test-img" width={cvData && !isLoading && isImage ? 400 : 0} height={cvData && !isLoading && isImage ? 400 : 0} />
        {cvData && !isLoading && !isImage && <h1>File PDF Ga Ada Preview</h1>}
        <input id="test-input" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
        {isLoading ? (
          <h1>Loading.....</h1>
        ) : (
          <>
            <button onClick={() => alert('TO DO: lakukan upload!')}>Misalkan Ini Button Upload</button>
            <div style={{ width: '80vw', margin: 'auto', minHeight: '50vh', background: '#ADD8E6' }}>
              {cvData.split('\n').map((v, i) => (
                <div key={i}>{v}</div>
              ))}
            </div>
            <div style={{ width: '80vw', margin: 'auto', minHeight: '100vh', background: '#1F75FE', color: 'white' }}>
              {cvJSONData.split('\n').map((v, i) => (
                <div key={i}>{v}</div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <img src="/vercel.svg" alt="Vercel Logo" className={styles.logo} />
        </a>
      </footer>
    </div >
  )
}
