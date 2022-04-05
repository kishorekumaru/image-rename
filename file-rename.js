const fsPromises = require("fs").promises;
const fs = require("fs");
const glob = require("glob");
const path = require("path");

var getDirectories = function (src, callback) {
  glob(src + "/**/*", callback);
};

/**
 * Read all files from './images' folder
 */
(async () => {
  try {
    const files = await fsPromises.readdir("./images");
    files.map(async (fileFolder) => {
      const stat = await fsPromises.lstat(`./images/${fileFolder}`);
      if (stat.isDirectory()) {
        getDirectories(`./images/${fileFolder}`, async (err, res) => {
          if (err) {
            console.log(err);
          } else {
            console.log(res, fileFolder);
            let fileCount = 0;
            // Move files into new folder
            res.map(async (file) => {
              const isFolder = await fsPromises.lstat(file);
              if (isFolder.isFile()) {
                const extension = file.split("/").pop().split(".").pop();
                const oldPath = path.join(__dirname, file);
                const newFolder = path.join(
                  __dirname,
                  `./new-images/${fileFolder}`
                );
                if (!fs.existsSync(newFolder)) {
                  fs.mkdirSync(newFolder, { recursive: true });
                }
                fileCount++;
                const result = await fsPromises.rename(
                  oldPath,
                  `${newFolder}/${fileCount}.${extension}`
                );
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.error(err);
  }
})().catch(() => {
  console.error;
});
