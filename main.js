//# Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//# Scoreboard setup
let score = 0;
const scoreDisplay = document.createElement('div');
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '10px';
scoreDisplay.style.left = '10px';
scoreDisplay.style.color = 'white';
scoreDisplay.innerText = `Score: ${score}`;
document.body.appendChild(scoreDisplay);

let highScore = 0;
const highScoreDisplay = document.createElement('div');
highScoreDisplay.style.position = 'absolute';
highScoreDisplay.style.top = '35px';
highScoreDisplay.style.left = '10px';
highScoreDisplay.style.color = 'white';
highScoreDisplay.innerText = `High Score: ${highScore}`;
document.body.appendChild(highScoreDisplay);

function updateScoreDisplay() {
    scoreDisplay.innerText = `Score: ${score}`;
    if (score > highScore) highScore = score;
    highScoreDisplay.innerText = `High Score: ${highScore}`;
}

//# GUI setup
const gui = new dat.GUI();
gui.domElement.style.position = 'fixed';
gui.domElement.style.top = '10px';
gui.domElement.style.right = '5px';
gui.domElement.style.zIndex = '110';
document.body.appendChild(gui.domElement);

const params = {
    mazeSize: 5,
    levels: 1,
    fov: 75,
    speed: 1
};
gui.add(params, 'mazeSize', 5, 50).step(1).onChange(() => {
    generateMaze();
});
gui.add(params, 'levels', 1, 10).step(1).onChange(() => {
    generateMaze();
});
gui.add(params, 'fov', 60, 150).step(1).onChange(() => {
    camera.fov = params.fov;
    camera.updateProjectionMatrix();
});
gui.add(params, 'speed', 1, 5).step(1);

//# Light setup
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

//# PointerLockControls setup
const controls = new THREE.PointerLockControls(camera, renderer.domElement);

const blocker = document.createElement('div');
blocker.style.position = 'absolute';
blocker.style.top = '0';
blocker.style.left = '0';
blocker.style.width = '100%';
blocker.style.height = '100%';
blocker.style.backgroundColor = 'rgba(0,0,0,0.7)';
blocker.style.color = 'white';
blocker.style.display = 'flex';
blocker.style.justifyContent = 'center';
blocker.style.alignItems = 'center';
blocker.style.fontSize = '24px';
blocker.style.cursor = 'pointer';
blocker.style.zIndex = '100';
blocker.innerHTML = 'Click to play / Press ESC to pause';
document.body.appendChild(blocker);

blocker.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
    updateGuiVisibility(true);
});

controls.addEventListener('unlock', () => {
    blocker.style.display = 'flex';
    updateGuiVisibility(false);
});

//# Minimap setup
const minimapSize = 400;
const minimapRenderer = new THREE.WebGLRenderer({ alpha: true });
minimapRenderer.setSize(minimapSize, minimapSize);
minimapRenderer.domElement.style.position = 'absolute';
minimapRenderer.domElement.style.bottom = '10px';
minimapRenderer.domElement.style.right = '10px';
minimapRenderer.domElement.style.display = 'none';
document.body.appendChild(minimapRenderer.domElement);

const minimapCamera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 100);

function updateMinimapCamera() {
    const mazeSize = params.mazeSize * 2 + 1;
    const center = mazeSize / 2;

    //# Calculate half-size for the orthographic camera to cover entire maze
    const halfSize = mazeSize / 2;

    minimapCamera.left = -halfSize - 2;
    minimapCamera.right = halfSize;
    minimapCamera.top = halfSize + 2;
    minimapCamera.bottom = -halfSize;

    minimapCamera.position.set(center, 50, center);
    minimapCamera.lookAt(center, 0, center);
    minimapCamera.updateProjectionMatrix();
}

function updateGuiVisibility(isPlaying) {
    gui.domElement.style.display = isPlaying ? 'none' : 'block';
    minimapRenderer.domElement.style.display = isPlaying ? 'none' : 'block';
}

//# Player setup
let player;
let velocity = new THREE.Vector3();
const jumpStrength = 0.35;
const gravity = -0.05;
let onGround = false;
let collidableMeshes = [];

function createPlayer() {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(geometry, material);
    player.position.set(1, params.levels * 2.5 + 20, 1);
    scene.add(player);
    camera.position.set(
        player.position.x,
        player.position.y + 0.25,
        player.position.z
    );
}
createPlayer();

function respawnPlayer() {
    score = 0;
    updateScoreDisplay();
    player.position.set(1, params.levels * 2.5 + 20, 1);
}

//# Maze generation
function generateMaze() {
    scene.children = scene.children.filter(child =>
        child.type === 'AmbientLight' ||
        child.type === 'DirectionalLight' ||
        child === player
    );

    collidableMeshes = [];

    for (let level = 0; level < params.levels; level++) {
        createLevel(level);
    }

    player.position.y = params.levels * 2.5 + 2;
    updateMinimapCamera();
}
generateMaze();

function createLevel(level) {
    const size = params.mazeSize * 2 + 1;
    const yOffset = level * 5;
    const maze = generateMazeRecursiveBacktracking(size);

    //# Exit position
    let ex, ey;
    //# Finetune exit position to avoid walls
    do {
        ex = Math.floor(Math.random() * size);
        ey = Math.floor(Math.random() * size);
    } while (maze[ex][ey] === 1);

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (maze[x][y] === 1) {
                createWall(x, yOffset, y);
            } else if (!(x === ex && y === ey)) {
                createFloorTile(x, yOffset, y);
            }
        }
    }

    const exitGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const exitMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const exit = new THREE.Mesh(exitGeometry, exitMaterial);
    exit.position.set(ex, yOffset + 0.05, ey);
    
    scene.add(exit);
}

function generateMazeRecursiveBacktracking(size) {
    if (size < 3) {
        throw new Error("Size must be at least 3");
    }

    const WALL = 1;
    const PATH = 0;

    //# Create a 2D grid initialized with walls (1)
    const maze = Array.from({ length: size }, () => Array(size).fill(WALL));
    const stack = [];

    //# Set starting point
    const startX = 1;
    const startY = 1;
    maze[startX][startY] = PATH;
    stack.push([startX, startY]);

    //# Define movement directions (right, left, down, up)
    const directions = [
        [2, 0],   //# Right
        [-2, 0],  //# Left
        [0, 2],   //# Down
        [0, -2]   //# Up
    ];

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    while (stack.length > 0) {
        const [currentX, currentY] = stack[stack.length - 1];
        shuffleArray(directions);
        let moved = false;

        for (const [dx, dy] of directions) {
            const neighborX = currentX + dx;
            const neighborY = currentY + dy;

            if (isValidCell(neighborX, neighborY)) {
                //# Carve path between current and neighbor
                maze[currentX + dx / 2][currentY + dy / 2] = PATH;
                maze[neighborX][neighborY] = PATH;
                stack.push([neighborX, neighborY]);
                moved = true;
                break; //# Only move to one new cell at a time
            }
        }

        if (!moved) {
            stack.pop(); //# Backtrack if no valid moves are found
        }
    }

    function isValidCell(x, y) {
        return x > 0 && x < size - 1 &&
            y > 0 && y < size - 1 &&
            maze[x][y] === WALL;
    }

    return maze;
}

function createWall(x, y, z) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    wall.position.set(x, y + 0.55, z);
    scene.add(wall);
    collidableMeshes.push(wall);
}

function createFloorTile(x, y, z) {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
    floor.position.set(x, y, z);
    scene.add(floor);
    collidableMeshes.push(floor);
}

//# Input
const keys = { W: false, A: false, S: false, D: false, ArrowLeft: false, ArrowRight: false };
document.addEventListener('keydown', e => {
    const key = e.key.toUpperCase();
    keys[key] = true;

    if (key === 'R') respawnPlayer();

    if (e.code === 'Space' && onGround) {
        velocity.y = jumpStrength;
        onGround = false;
    }
});
document.addEventListener('keyup', e => {
    keys[e.key.toUpperCase()] = false;
});

function updateViewRotation() {
    const rotationSpeed = 0.03;

    if (keys['ArrowLeft']) {
        controls.rotation.y += rotationSpeed;
    }
    if (keys['ArrowRight']) {
        controls.rotation.y -= rotationSpeed;
    }
}

function movePlayer() {
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const moveVector = new THREE.Vector3();

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys['W']) moveVector.add(forward);
    if (keys['S']) moveVector.sub(forward);
    if (keys['A']) moveVector.sub(right);
    if (keys['D']) moveVector.add(right);

    moveVector.normalize();
    moveVector.multiplyScalar(0.025 * params.speed);

    velocity.y += gravity;

    const originalPosition = player.position.clone();

    //# Try moving in X only
    let proposedX = originalPosition.clone().add(new THREE.Vector3(moveVector.x, 0, 0));
    let boxX = new THREE.Box3().setFromCenterAndSize(proposedX, new THREE.Vector3(0.5, 0.5, 0.5));
    if (!collidableMeshes.some(mesh => boxX.intersectsBox(new THREE.Box3().setFromObject(mesh)))) {
        player.position.x = proposedX.x;
    }

    //# Try moving in Z only
    let proposedZ = player.position.clone().add(new THREE.Vector3(0, 0, moveVector.z));
    let boxZ = new THREE.Box3().setFromCenterAndSize(proposedZ, new THREE.Vector3(0.5, 0.5, 0.5));
    if (!collidableMeshes.some(mesh => boxZ.intersectsBox(new THREE.Box3().setFromObject(mesh)))) {
        player.position.z = proposedZ.z;
    }

    //# Apply gravity (Y axis)
    const proposedY = player.position.clone().add(new THREE.Vector3(0, velocity.y, 0));
    const boxY = new THREE.Box3().setFromCenterAndSize(proposedY, new THREE.Vector3(0.5, 0.5, 0.5));
    onGround = false;
    if (!collidableMeshes.some(mesh => boxY.intersectsBox(new THREE.Box3().setFromObject(mesh)))) {
        player.position.y = proposedY.y;
    } else {
        if (velocity.y < 0) {
            velocity.y = 0;
            onGround = true;
        }
    }
}

function checkForExit() {
    scene.children.forEach(child => {
        if (child.isMesh && child !== player && child.material.color.equals(new THREE.Color(0xff0000))) {
            const distance = player.position.distanceTo(child.position);
            if (distance < 0.5) {
                score += params.mazeSize;
                updateScoreDisplay();
                generateMaze();
            }
        }
    });
}

function animate() {
    requestAnimationFrame(animate);

    if (player.position.y < -20) respawnPlayer();
    updateViewRotation();
    movePlayer();
    checkForExit();

    camera.position.set(
        player.position.x,
        player.position.y + 0.25,
        player.position.z
    );

    renderer.render(scene, camera);

    if (blocker.style.display === 'flex') {
        minimapRenderer.render(scene, minimapCamera);
    }
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
