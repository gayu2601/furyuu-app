import keys from '../../constants/Keys';

export function getFileUrl(
  filePath,
  bucketName,
  columnName
) {
  if (!filePath) return null;

  if (filePath.startsWith('drive::')) {
    const fileId = filePath.replace('drive::', '');
	return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  // columnName IS the subfolder — no map needed
  const fullPath = filePath.includes('/') ? filePath : `${columnName}/${filePath}`;
  
  return `${keys.supabase_url}/storage/v1/object/public/${bucketName}/${fullPath}`;
}