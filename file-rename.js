const fsPromises = require("fs").promises;
const csv = require("csvtojson");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

var getDirectories = function (src) {
  return new Promise((res, rej) =>
    glob(src + "/**/*", function (err, resp) {
      if (err) {
        rej(err);
      }
      res(resp);
    })
  );
};

var convertSEOValue = function (name) {
  return name
    .normalize("NFD") // Change diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove illegal characters
    .replace(/\s+/g, "_") // Change whitespace to dashes
    .toLowerCase() // Change to lowercase
    .replace(/&/g, "_and_") // Replace ampersand
    .replace(/[^a-z0-9\_]/g, ""); // Remove anything that is not a letter, number or hyphen
};

const updateFileNames = async (files, jsonArray, callback) => {
  try {
    await Promise.all(
      files.map(async (fileFolder) => {
        const stat = await fsPromises.lstat(`./images/${fileFolder}`);
        if (stat.isDirectory()) {
          const res = await getDirectories(`./images/${fileFolder}`);
          let fileCount = 0;
          // Move files into new folder
          await Promise.all(
            res.map(async (file) => {
              const isFolder = await fsPromises.lstat(file);
              if (isFolder.isFile()) {
                const extension = file.split("/").pop().split(".").pop();
                const oldPath = path.join(__dirname, file);
                const newFolder = path.join(
                  __dirname,
                  `./new-images/${fileFolder}`
                );
                /**
                 * get the image name from the csv
                 */
                fileCount++;
                const fileIndex = jsonArray.findIndex(
                  (item) => item.sku === fileFolder
                );
                let name = `${fileCount}.${extension}`;
                if (fileIndex !== -1) {
                  name = `${convertSEOValue(
                    jsonArray[fileIndex].name
                  )}_${name}`;
                  jsonArray[fileIndex].product_image_file =
                    fileCount === 1
                      ? new Array(name)
                      : jsonArray[fileIndex].product_image_file.concat(name);
                }
                if (!fs.existsSync(newFolder)) {
                  fs.mkdirSync(newFolder, { recursive: true });
                }
                const result = await fsPromises.rename(
                  oldPath,
                  `${newFolder}/${name}`
                );
              }
            })
          );
        }
      })
    );
    callback(
      jsonArray.map((item) =>
        Array.isArray(item.product_image_file)
          ? {
              ...item,
              product_image_file: item.product_image_file.join(", "),
            }
          : item
      )
    );
  } catch (err) {
    console.log(err);
  }
};

(async () => {
  try {
    const files = await fsPromises.readdir("./images");
    const csvFilePath = "./csv/jimbo.csv";
    const jsonArray = await csv().fromFile(csvFilePath);
    console.log(jsonArray);

    updateFileNames(files, jsonArray, (newJsonArry) => {
      /**
       * Use parser to convert JSON to csv
       */
      const allHeaders = Object.keys(newJsonArry[0]);
      const csWriter = createCsvWriter({
        path: "./csv/new-jimbo.csv",
        header: allHeaders,
      });

      const headers = allHeaders.reduce(
        (acc, curr) => ({ ...acc, [curr]: curr }),
        {}
      );

      csWriter.writeRecords([...[headers], ...newJsonArry]).then((err) => {
        if (err) return console.log(err);
        console.log("new file successfully written");
      });
    });
  } catch (err) {
    console.error(err);
  }
})().catch(() => {
  console.error;
});
