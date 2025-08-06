import * as FileSystem from 'expo-file-system';

export const saveSupabaseDataToFile = async (supabaseData, filename) => {
	  try {
		// File path where the image will be saved
		const fileUri = `${FileSystem.cacheDirectory}${filename}`;

		// Access the raw binary data
		const blob = supabaseData;

		// Convert the blob to a Base64 string using a FileReader
		const reader = new FileReader();
		return new Promise((resolve, reject) => {
		  reader.onloadend = async () => {
			try {
			  // Extract Base64 string
			  const base64Data = reader.result.split(',')[1]; // Removes the `data:image/...` prefix

			  // Write Base64 string to file
			  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
				encoding: FileSystem.EncodingType.Base64,
			  });

			  console.log('File saved at:', fileUri);
			  resolve(fileUri); // Return the local file URI
			} catch (error) {
			  reject(error);
			}
		  };

		  // Read the blob as a Base64 string
		  reader.readAsDataURL(blob);
		});
	  } catch (error) {
		console.error('Error saving Supabase data to file:', error);
		throw error;
	  }
	};