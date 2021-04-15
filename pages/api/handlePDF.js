// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import nextConnect from 'next-connect';
import multer from 'multer'
const { Storage } = require('@google-cloud/storage')
const vision = require('@google-cloud/vision')
import fs from 'fs/promises'

const googleCreds = JSON.parse(Buffer.from(process.env.GOOGLE_CREDS, 'base64').toString('ascii'))
const credentials = {
  client_email: googleCreds.client_email,
  private_key: googleCreds.private_key
}
// console.log(credentials)

const apiRoute = nextConnect({
  onError(error, req, res) {
    console.log(error)
    res.status(501).json({ error: `Sorry something Happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => cb(null, file.originalname),
  }),
});

const uploadMiddleware = upload.single('pdf-file');

// Adds the middleware to Next-Connect
apiRoute.use(uploadMiddleware);

// Process a POST request using GCS
// apiRoute.post((req, res) => {
//   const storage = new Storage({ credentials })
//   const bucketName = process.env.BUCKET_NAME;
//   const fileName = `temp-${Date.now()}`
//   const filePath = req.file.path

//     ; (async function () {
//       await storage.bucket(bucketName).upload(filePath, {
//         destination: fileName,
//       })
//       console.log(`${filePath} uploaded to ${bucketName}/${fileName}`);

//       const client = new vision.ImageAnnotatorClient({ credentials });
//       const request = {
//         "requests": [
//           {
//             "inputConfig": {
//               "mimeType": 'application/pdf',
//               "gcsSource": {
//                 "uri": `gs://${bucketName}/${fileName}`,
//               },
//             },
//             "features": [
//               {
//                 "type": "DOCUMENT_TEXT_DETECTION",
//               }
//             ],
//             "outputConfig": {
//               "gcsDestination": {
//                 "uri": `gs://${bucketName}/temp-cloud-vision/`,
//               },
//             },
//           }
//         ]
//       }
//       const [operation] = await client.asyncBatchAnnotateFiles(request);
//       const [filesResponse] = await operation.promise();
//       const destinationUri = filesResponse.responses[0].outputConfig.gcsDestination.uri;
//       console.log(filesResponse)
//       console.log('Json saved to: ' + destinationUri);

//       res.status(200).json({ filesResponse })
//     })().catch(console.error)

// });

apiRoute.post(async (req, res) => {
  try {
    const client = new vision.ImageAnnotatorClient({ credentials });
      const request = {
        "requests": [
          {
            "inputConfig": {
              "mimeType": 'application/pdf',
              "content": await fs.readFile(req.file.path)
            },
            "features": [
              {
                "type": "DOCUMENT_TEXT_DETECTION",
              }
            ],
          }
        ]
      }
      const [result] = await client.batchAnnotateFiles(request);
      await fs.unlink(req.file.path)
      res.status(200).json({ result: result.responses[0].responses.map(v=>v.fullTextAnnotation.text) })
  } catch (error) {
    console.log(error)
    res.status(500).json({message: error.message})
  }
});

export default apiRoute;


export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
