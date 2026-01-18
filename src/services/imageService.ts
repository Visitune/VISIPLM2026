
/**
 * Service de compression d'images côté client.
 * Indispensable pour ne pas saturer le LocalStorage avec des images HD.
 */

export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                // Calcul du ratio pour redimensionnement
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Impossible de créer le contexte Canvas"));
                    return;
                }

                // Dessin et compression
                ctx.drawImage(img, 0, 0, width, height);
                
                // Export en JPEG compressé (le PNG est souvent trop lourd pour les photos)
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
};
