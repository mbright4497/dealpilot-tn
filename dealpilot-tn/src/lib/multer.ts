// Minimal multer shim for build-time only. At runtime, install 'multer' for production.
export default function multer(opts?: any){
  const memStore = {
    memoryStorage: () => ({})
  };
  const uploader = () => (req:any, res:any, next:any)=>{ next(); };
  uploader.single = (fieldName:string) => (req:any,res:any,next:any)=>{ next(); };
  return Object.assign(uploader, { memoryStorage: memStore.memoryStorage });
}
