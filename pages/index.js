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
      // UNTUK PNG & JPG
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
    } else {
      // UNTUK PDF
      setIsImage(false)
      const formData = new FormData();
      formData.append('pdf-file', file)
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
        .then(({ data: { result, asli } }) => {
          setIsLoading(false)
          console.log('asli', asli)
          
          const page1 = asli.responses[0].responses[0].fullTextAnnotation.pages[0]
          const { width, height, blocks } = page1
          const mappedBlocks = blocks.map(blk => {
            const blkObj = {}
            blkObj.bound = blk.boundingBox.normalizedVertices.map(v => ({ x: v.x * width, y: v.y * height }))
            blkObj.sentence = blk.paragraphs.map(p => p.words.map(w => w.symbols.map(s => s.text).join('')).join(' ')).join('\n')
            return blkObj
          })
          console.log('mappedBlocks', mappedBlocks)

          const refBound = mappedBlocks.find(v => v.sentence.toLowerCase() === '281,892 t').bound
          function isWithin(a, b) {
            let result = false
            let key
            const x1 = Math.abs(refBound[0].x - refBound[1].x)
            const y1 = Math.abs(refBound[0].y - refBound[1].y)
            const top = x1 > y1 ? x1 : y1
            const x2 = Math.abs(refBound[1].x - refBound[2].x)
            const y2 = Math.abs(refBound[1].y - refBound[2].y)
            const left = x2 > y2 ? x2 : y2
            const isVertical = top/left > 0
            if(isVertical){
              key = 'y'
            } else {
              key = 'x'
            }
            if(((a[0][key] <= b[0][key]) && (a[1][key] >= b[1][key])) || ((a[0][key] >= b[0][key]) && (a[1][key] <= b[1][key]))){
              result = true
            }
            // console.log(isVertical, result, top/left, x1,y1,x2,y2)
            
            return result
          }

          let take = false
          const tableData = mappedBlocks.filter(v => {
            if (v.sentence.toLowerCase() === 'bl no') {
              take = true
            }
            if (v.sentence.toLowerCase() === '281,892 t') {
              take = false
              return true
            }
            return take
          })
          console.log('tableData', tableData)

          // isWithin(tableData[0].bound, tableData[1].bound)
          // isWithin(tableData[3].bound, tableData[7].bound)
          // isWithin(tableData[4].bound, tableData[21].bound)
          // isWithin(tableData[4].bound, tableData[25].bound)
          // isWithin(tableData[4].bound, tableData[26].bound)

          // const table = []
          // let row = 0
          // tableData.forEach(val => {
          //   if (!table.length) {
          //     table.push([])
          //   }
            
          //   if (isWithin(val.bound, tableData[0].bound)) {
          //     if(val.sentence.toLowerCase() !== "01" && table.length !== 1){
          //       row++
          //     } 
          //   }

          //   // else {
          //   //   const boundIndex = tableData[0].findIndex(v=>{
          //   //     return isWithin(val.bound, v.bound)
          //   //   })
          //   // }

          //   table[row].push(val)
          // })

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
        console.log(responses)
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
