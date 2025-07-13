const fs = require('fs')
const key = fs.readFileSync('./dreams-estate-firebase-adminsdk-fbsvc-6c9f8e8393.json','utf8');
const base64 = Buffer.from(key).toString('base64') 
console.log(base64);