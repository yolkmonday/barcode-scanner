import * as SDCCore from "scandit-web-datacapture-core";
import * as SDCBarcode from "scandit-web-datacapture-barcode";

declare global {
  interface Window {
    continueScanning: () => Promise<void>;
  }
}

async function run(): Promise<void> {
  localStorage.removeItem('barcode')
  // To visualize the ongoing loading process on screen, the view must be connected before the configure phase.
  const view = new SDCCore.DataCaptureView();

  // Connect the data capture view to the HTML element.
  view.connectToElement(document.getElementById("data-capture-view")!);

  // Set the progress bar message
  view.setProgressBarMessage("Loading...");

  // Show the loading layer
  view.showProgressBar();

  // There is a Scandit sample license key set below here.
  // This license key is enabled for sample evaluation only.
  // If you want to build your own application, get your license key by signing up for a trial at https://ssl.scandit.com/dashboard/sign-up?p=test
  // The passed parameter represents the location of the wasm file, which will be fetched asynchronously.
  // You must `await` the returned promise to be able to continue.
  await SDCCore.configure({
    licenseKey: "ASIz8CgpDAVJGQn0KgvRXU1DDRo3BUe3Q0EixiZ1yAIeYEF80XtNLlo5mQSGXS5nSn1q11whwFDddglA9EWkzTV4IbjCKUvIx16gaSVcZI0SYBO8EE5b79UXJK6iR/ePjFku2woR1e98BvErWiOqxBEMMf0CNlO7ikU1w9i8MkkVCJGWcic7fji7TYd3nftakp/rx6gEK1xyHBuw+mrBOmCwhjcdgrnSRMDuRNc1unrQY1bpntUPCgTyKND+14DsoEr1uZtK2v7xPtjB0z8L9WtfXUgR9qPqhZnhpJ3pig3mK4pVNgQqv7eOaw+PWnM6u/JxnXtnR67RwatvG4MRPOXwHKQ+m5fYcFUsg3WffSvAaqreeqTnrJxhyLU1MaWTjo1XgVmGnHHpV/oymJeyoG8HHlIZrKRPphCTv+DvvGXVxgvFLM8DVyZH6pE2aE03KpgiQUwcyiQqbZmqmvWzYcywzEMOfxcmFtP9z07EI4s/1xv/JMvkjUOIeKwnS/p2MgymOMjWIwOmGx2cLE3hjcwWBG6TX32azUq1CaH3nnM6RGVfZdvZyF8AG+C+tFMvzF/6FxqOOk60aFVlgvPNG4ZMSBDLAnmtw+mr7ZFKt9cYS/LtB0tnsR2pQhVlV829PLgDnrtzratk1N/b6Vk2ZBsvExcmZ/6e6tbYn4/crfEl4hqWdAfU4DTpzFpHLKsODIeCc5GUIa1fXS+ULKGu3UKgbBGbccifvt/X3hUbWejlC42uO7PlMX+GvlVQVBlxJjtd0JvAqmgV/HvX5+A5Sph2CwlSQqMSRNxrE5ffJLYUlLgaS0N8ga7OjCS4cDCVyLgSu3Lq7k42bQ==",
    libraryLocation: new URL("library/engine/", document.baseURI).toString(),
    moduleLoaders: [SDCBarcode.barcodeCaptureLoader()],
  });

  // Set the progress bar to be in an indeterminate state
  view.setProgressBarPercentage(null);
  view.setProgressBarMessage("Accessing Camera...");

  // Create the data capture context.
  const context: SDCCore.DataCaptureContext = await SDCCore.DataCaptureContext.create();

  // To visualize the ongoing barcode capturing process on screen, attach the data capture view that renders the
  // camera preview. The view must be connected to the data capture context.
  await view.setContext(context);

  // Try to use the world-facing (back) camera and set it as the frame source of the context. The camera is off by
  // default and must be turned on to start streaming frames to the data capture context for recognition.
  const camera: SDCCore.Camera = SDCCore.Camera.default;
  const cameraSettings = SDCBarcode.BarcodeCapture.recommendedCameraSettings;
  await camera.applySettings(cameraSettings);
  await context.setFrameSource(camera);

  // The barcode capturing process is configured through barcode capture settings,
  // they are then applied to the barcode capture instance that manages barcode recognition.
  const settings: SDCBarcode.BarcodeCaptureSettings = new SDCBarcode.BarcodeCaptureSettings();

  // The settings instance initially has all types of barcodes (symbologies) disabled. For the purpose of this
  // sample we enable a very generous set of symbologies. In your own app ensure that you only enable the
  // symbologies that your app requires as every additional enabled symbology has an impact on processing times.
  settings.enableSymbologies([
    SDCBarcode.Symbology.EAN13UPCA,
    SDCBarcode.Symbology.EAN8,
    SDCBarcode.Symbology.UPCE,
    SDCBarcode.Symbology.QR,
    SDCBarcode.Symbology.DataMatrix,
    SDCBarcode.Symbology.Code39,
    SDCBarcode.Symbology.Code128,
    SDCBarcode.Symbology.InterleavedTwoOfFive,
  ]);

  // Some linear/1D barcode symbologies allow you to encode variable-length data. By default, the Scandit
  // Data Capture SDK only scans barcodes in a certain length range. If your application requires scanning of one
  // of these symbologies, and the length is falling outside the default range, you may need to adjust the "active
  // symbol counts" for this symbology. This is shown in the following few lines of code for one of the
  // variable-length symbologies.
  const symbologySettings: SDCBarcode.SymbologySettings = settings.settingsForSymbology(SDCBarcode.Symbology.Code39);
  symbologySettings.activeSymbolCounts = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // Create a new barcode capture mode with the settings from above.
  const barcodeCapture = await SDCBarcode.BarcodeCapture.forContext(context, settings);
  // Disable the barcode capture mode until the camera is accessed.
  await barcodeCapture.setEnabled(false);

  // Add a control to be able to switch cameras.
  view.addControl(new SDCCore.CameraSwitchControl());

  // Add a barcode capture overlay to the data capture view to render the location of captured barcodes on top of
  // the video preview. This is optional, but recommended for better visual feedback.
  const barcodeCaptureOverlay: SDCBarcode.BarcodeCaptureOverlay =
    await SDCBarcode.BarcodeCaptureOverlay.withBarcodeCaptureForViewWithStyle(
      barcodeCapture,
      view,
      SDCBarcode.BarcodeCaptureOverlayStyle.Frame
    );

  // Register a listener to get informed whenever a new barcode got recognized.
  barcodeCapture.addListener({
    didScan: async (barcodeCaptureMode: SDCBarcode.BarcodeCapture, session: SDCBarcode.BarcodeCaptureSession) => {
      // Hide the viewfinder.
      await barcodeCaptureOverlay.setViewfinder(null);
      // Disable the capture of barcodes until the user closes the displayed result.
      await barcodeCapture.setEnabled(false);
      const barcode: SDCBarcode.Barcode = session.newlyRecognizedBarcodes[0];
      const symbology: SDCBarcode.SymbologyDescription = new SDCBarcode.SymbologyDescription(barcode.symbology);
      showResult(`${barcode.data ?? ""}`);
    },
  });

  const viewfinder: SDCCore.RectangularViewfinder = new SDCCore.RectangularViewfinder(
    SDCCore.RectangularViewfinderStyle.Square,
    SDCCore.RectangularViewfinderLineStyle.Light
  );
  await barcodeCaptureOverlay.setViewfinder(viewfinder);

  // Switch the camera on to start streaming frames.
  // The camera is started asynchronously and will take some time to completely turn on.
  await camera.switchToDesiredState(SDCCore.FrameSourceState.On);
  await barcodeCapture.setEnabled(true);

  // The progress bar layer could be also hidden right after the configure phase
  view.hideProgressBar();
  function showResult(result: string): void {

    localStorage.setItem('barcode',result)
    // const resultElement = document.createElement("div");
    // resultElement.className = "result";
    // resultElement.innerHTML = `
    //   <p class="result-text"></p>
    //   <button onclick="continueScanning()">OK</button>
    //   `;
    // document.querySelector("#data-capture-view")!.append(resultElement);
    // document.querySelector("#data-capture-view .result-text")!.textContent = result;
  }

  window.continueScanning = async function continueScanning(): Promise<void> {
    for (const r of document.querySelectorAll(".result")!) r.remove();
    await barcodeCapture.setEnabled(true);
    // Restore the viewfinder.
    await barcodeCaptureOverlay.setViewfinder(viewfinder);
  };
}

run().catch((error: unknown) => {
  console.error(error);
  alert(JSON.stringify(error, null, 2));
});
