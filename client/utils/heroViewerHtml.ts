export function buildHeroViewerHtml(modelUrl: string, accent: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent;
          }
          canvas {
            display: block;
            width: 100vw;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <script src="/static/js/three.min.js"></script>
        <script src="/static/js/GLTFLoader.js"></script>
        <script>
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
          camera.position.set(0, 1.2, 4.2);

          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
          renderer.setPixelRatio(window.devicePixelRatio || 1);
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.outputEncoding = THREE.sRGBEncoding;
          document.body.appendChild(renderer.domElement);

          const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2f45, 2.1);
          scene.add(hemi);

          const accentLight = new THREE.DirectionalLight('${accent}', 1.4);
          accentLight.position.set(4, 8, 6);
          scene.add(accentLight);

          const fill = new THREE.DirectionalLight(0xffffff, 1.1);
          fill.position.set(-4, 3, 4);
          scene.add(fill);

          const loader = new THREE.GLTFLoader();
          let root = null;

          function fitModel(object) {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            object.position.x -= center.x;
            object.position.y -= center.y - size.y * 0.1;
            object.position.z -= center.z;

            const maxSize = Math.max(size.x, size.y, size.z) || 1;
            const scale = 2.2 / maxSize;
            object.scale.setScalar(scale);
          }

          loader.load(
            '${modelUrl}',
            function (gltf) {
              root = gltf.scene;
              fitModel(root);
              scene.add(root);
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage('loaded');
            },
            undefined,
            function () {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage('error');
            }
          );

          function animate() {
            requestAnimationFrame(animate);
            if (root) {
              root.rotation.y += 0.012;
            }
            renderer.render(scene, camera);
          }
          animate();

          window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          });
        </script>
      </body>
    </html>
  `;
}
