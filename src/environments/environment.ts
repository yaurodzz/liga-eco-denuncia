// Preencha com os dados do SEU projeto. Mantenha as MESMAS chaves em environment.prod.ts.
// Firebase: Console > Configurações do projeto > Seus apps > app Web > Config do SDK
// Cloudinary: Settings > Upload > Upload presets > Add upload preset (Signing Mode = Unsigned)
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyB2QDJtXwbKntPgwmvHV3Tk_F09APWxK20",
    authDomain: "eco-denuncia.firebaseapp.com",
    projectId: "eco-denuncia",
    storageBucket: "eco-denuncia.firebasestorage.app",
    messagingSenderId: "621931656857",
    appId: "1:621931656857:web:ea6d6daf5b3c6d36e82a08",
  },
  cloudinary: {
    cloudName: 'uucjos3o',
    uploadPreset: 'eco-denuncia',
    folder: 'eco-denuncia',
  },
};
