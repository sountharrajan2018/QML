/*
 * Lecture content for the step-by-step encoding pages.
 * Each encoding has the same eight steps; the text here fills them.
 * Formulas are plain HTML so the site works offline.
 */
(function () {
  "use strict";
  const PI = Math.PI;
  const f = (v, d = 3) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(d);
  const deg = (r) => `${f((r * 180) / PI, 1)}&deg;`;

  // ------------------------------------------------------------ glossary (hover any dotted term)
  const GLOSSARY = {
    qubit: "The quantum bit: a 2-level system whose state is a|0&rang; + b|1&rang; with |a|&sup2; + |b|&sup2; = 1.",
    superposition: "A state that is a weighted sum of basis states, e.g. (|0&rang; + |1&rang;)/&radic;2. Measuring picks one outcome at random.",
    "basis state": "One of the 2<sup>n</sup> definite bit strings |00&hellip;0&rang; &hellip; |11&hellip;1&rang; of an n-qubit register.",
    amplitude: "The complex number in front of a basis state. Its squared magnitude is the probability of measuring that state.",
    phase: "The angle of a complex amplitude. Relative phases are invisible to a direct measurement but change interference.",
    "Bloch sphere": "A picture of one qubit as a point on a unit sphere: |0&rang; at the north pole, |1&rang; at the south pole, superpositions on the equator.",
    entanglement: "Correlation that cannot be described qubit by qubit. On the Bloch sphere an entangled qubit's vector is shorter than 1.",
    kernel: "A similarity function k(x, x&prime;) between data points. Kernel methods (like SVMs) learn using only these similarities.",
    fidelity: "The overlap |&lang;&psi;|&phi;&rang;|&sup2; between two states: 1 if identical, 0 if orthogonal.",
    Hamiltonian: "The energy operator H of a quantum system. It generates the time evolution e<sup>&minus;iHt</sup>.",
    Trotterisation: "Approximating e<sup>&minus;i(A+B)t</sup> by alternating short steps e<sup>&minus;iA&Delta;t</sup>e<sup>&minus;iB&Delta;t</sup>. More steps give a smaller error.",
    unitary: "A reversible, length-preserving operation U (U&dagger;U = I). Every gate is a unitary.",
    shots: "Repetitions of prepare-and-measure. Probabilities are estimated from the counts over many shots.",
    overfitting: "A model that fits its training data very well but does worse on new data.",
    "feature map": "Another name for an encoding: the map x &rarr; |&psi;(x)&rang; from data to quantum states.",
  };

  // ------------------------------------------------------------ per-encoding content
  const CONTENT = {
    basis: {
      num: 1,
      tagline: "Write the bits of your data straight into the qubits.",
      hook: "A zookeeper's database stores four yes/no traits for each animal. Before any quantum algorithm can search or compare these records, each record has to become a quantum state.",
      bigIdea: "One bit becomes one qubit: 0 stays |0&rang;, 1 becomes |1&rang;. The record <b>is</b> a <span class=\"term\">basis state</span>.",
      analogy: "Like setting a row of light switches: each switch is either off or on, and the whole row spells out the record.",
      formula: "x = (b<sub>1</sub>, &hellip;, b<sub>n</sub>) &isin; {0,1}<sup>n</sup> &nbsp;&rarr;&nbsp; |x&rang; = |b<sub>1</sub> b<sub>2</sub> &hellip; b<sub>n</sub>&rang;",
      formulaParts: [
        ["b<sub>i</sub>", "the i-th yes/no trait (0 or 1)"],
        ["|b<sub>1</sub>&hellip;b<sub>n</sub>&rang;", "a single basis state out of 2<sup>n</sup> possibilities"],
      ],
      useWhen: ["Binary or categorical data", "Inputs to oracles and quantum arithmetic", "Grover-style search"],
      data: "Yes/no traits are already bits, so no rescaling is needed. Each animal becomes one of the 2<sup>4</sup> = 16 basis states.",
      prep: "Basis encoding needs no arithmetic: each 1 gets an X gate, each 0 is left alone.",
      circuit: "Only X (NOT) gates appear, one per 1-bit, all in parallel. Step through them and watch the single 100% amplitude jump from |0000&rang; to the record.",
      measure: "Measurement always returns the same bit string, so the encoded state is not random at all. Switch to the X basis and the outcome becomes uniform: the definite bits are invisible from that angle.",
      kernel: "Two different bit strings are orthogonal, so k = 0. Identical strings give k = 1. Nothing in between: the encoding has no notion of 'nearly the same'.",
      classify: "With a delta kernel the classifier can only recognise exact matches from training. New patterns get a score of exactly 0.",
      tries: {
        data: "Click Dog and then Cat: both are |1000&rang;. Basis encoding cannot tell them apart.",
        prep: "Toggle traits and read off the ket.",
        circuit: "Count the X gates: always equal to the number of 1s in the record.",
        measure: "Run 1000 shots in the Z basis: every shot gives the same answer.",
        kernel: "Pick Dog and Bat (one bit different): k = 0, the same as for two completely different animals.",
      },
      deeper: {
        idea: "For n bits the register lives in a 2<sup>n</sup>-dimensional Hilbert space, but basis encoding only ever uses its corners: the computational basis vectors e<sub>x</sub>. A whole dataset D = {x<sup>1</sup>,&hellip;,x<sup>M</sup>} can be loaded at once as |D&rang; = M<sup>&minus;1/2</sup> &Sigma;<sub>m</sub> |x<sup>m</sup>&rang; (Schuld &amp; Petruccione, ch. 5). Preparing it needs a state-preparation routine as costly as amplitude encoding in general.",
        kernel: "k(x, x&prime;) = |&lang;x|x&prime;&rang;|<sup>2</sup> = &delta;<sub>x,x&prime;</sub>. The Gram matrix is block-diagonal with all-ones blocks for duplicate records, so a kernel machine reduces to a lookup table.",
      },
      quiz: [
        { q: "How many qubits does basis encoding need for 4 binary features?", options: ["4", "2", "16", "1"], answer: 0, why: "One qubit per bit. 16 = 2<sup>4</sup> is the number of possible basis states, not the number of qubits." },
        { q: "Dog |1000&rang; and Bat |1010&rang; differ in one bit. What is their kernel value?", options: ["0.75", "0.5", "0", "1"], answer: 2, why: "Different basis states are orthogonal, however many bits they share, so &lang;1000|1010&rang; = 0." },
        { q: "Which task suits basis encoding best?", options: ["Classifying smooth sensor readings", "Feeding bit strings to a Grover search oracle", "Compressing an image", "Regression on prices"], answer: 1, why: "Oracles and quantum arithmetic act on definite bit strings. For learning smooth patterns the delta kernel generalises poorly." },
      ],
      qiskit: `from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

bits = [1, 0, 1, 0]            # Bat: fur, eggs, flies, aquatic
qc = QuantumCircuit(len(bits))
for i, b in enumerate(bits):
    if b:
        qc.x(i)

# Qiskit prints qubit 0 as the RIGHT-most bit, so |1010> here reads '0101'.
print(Statevector(qc).probabilities_dict(decimals=3))   # {'0101': 1.0}`,
      takeaway: "Basis encoding is exact and cheap, but every distinct input is orthogonal to every other. It shines as input to quantum algorithms and is a poor feature map for learning.",
    },

    angle: {
      num: 2,
      tagline: "One feature, one qubit, one rotation.",
      hook: "A fruit-sorting line measures each fruit's sugar and firmness on a 0&ndash;10 scale. We want a quantum model to separate ripe from unripe, so each reading must become a qubit state.",
      bigIdea: "Turn each number into a rotation angle. Small values stay near |0&rang;, large values swing towards |1&rang;.",
      analogy: "Like a dimmer dial on each qubit: turning the knob (the feature) rotates the state smoothly from 'off' to 'on'.",
      formula: "|x&rang; = &otimes;<sub>i</sub> R<sub>Y</sub>(&theta;<sub>i</sub>)|0&rang; = &otimes;<sub>i</sub> [ cos(&theta;<sub>i</sub>/2)|0&rang; + sin(&theta;<sub>i</sub>/2)|1&rang; ], &nbsp; &theta;<sub>i</sub> = &pi;&middot;(x<sub>i</sub> &minus; min)/(max &minus; min)",
      formulaParts: [
        ["&theta;<sub>i</sub>", "the feature rescaled to an angle in [0, &pi;]"],
        ["R<sub>Y</sub>(&theta;)", "rotation about the Y axis of the <span class=\"term\">Bloch sphere</span>"],
        ["&otimes;", "each qubit is rotated independently (a product state)"],
      ],
      useWhen: ["A few bounded continuous features", "Noisy near-term hardware (depth 1)", "Variational classifiers (as the first layer)"],
      data: "Sugar and firmness are bounded readings, and a bounded value maps cleanly onto a rotation between |0&rang; (minimum) and |1&rang; (maximum).",
      prep: "Min-max scale each feature to [0, &pi;]. That angle fixes the qubit's amplitudes cos(&theta;/2) and sin(&theta;/2).",
      circuit: "One R<sub>Y</sub> per qubit, all in parallel (depth 1). Step through: each gate tips one Bloch vector from the north pole down to its angle.",
      measure: "P(1) on a qubit is sin&sup2;(&theta;/2), so the measurement statistics reflect the feature value directly. With few shots the estimate is noisy; try 10 against 1000.",
      kernel: "k(x, x&prime;) = &prod;<sub>i</sub> cos&sup2;((&theta;<sub>i</sub> &minus; &theta;&prime;<sub>i</sub>)/2): a smooth bump that is 1 for equal angles and falls to 0 when the angles differ by &pi;.",
      classify: "Smooth kernel, simple data: the quantum kernel and the linear baseline both separate the two blobs.",
      tries: {
        data: "Find the most and least ripe fruit and compare where they sit.",
        prep: "Drag sugar from 0 to 10 and watch &theta;<sub>0</sub> go from 0 to &pi;.",
        circuit: "Check that every Bloch vector has length 1: angle encoding never entangles.",
        measure: "Set sugar to 5 (&theta; = &pi;/2): qubit 0 becomes a fair coin.",
        kernel: "Move B away from A along one feature and watch the cos&sup2; curve.",
      },
      deeper: {
        idea: "R<sub>Y</sub>(&theta;) = [[cos &theta;/2, &minus;sin &theta;/2], [sin &theta;/2, cos &theta;/2]]. The state is a product over qubits, so it lives on a 2n-dimensional real manifold inside the 2<sup>n</sup>-dimensional space. The scaling to [0, &pi;] avoids aliasing: &theta; = 0 and &theta; = 2&pi; are the same physical state (they differ by the global phase &minus;1).",
        kernel: "&lang;&psi;(x)|&psi;(x&prime;)&rang; = &prod;<sub>i</sub> [cos(&theta;<sub>i</sub>/2)cos(&theta;&prime;<sub>i</sub>/2) + sin(&theta;<sub>i</sub>/2)sin(&theta;&prime;<sub>i</sub>/2)] = &prod;<sub>i</sub> cos((&theta;<sub>i</sub>&minus;&theta;&prime;<sub>i</sub>)/2). Squaring gives the product of cos&sup2; terms: a classically cheap, translation-invariant kernel, so no quantum advantage is possible here.",
      },
      quiz: [
        { q: "Sugar = 10 (the maximum) is encoded as &theta; = &pi;. What state is qubit 0 in?", options: ["|0&rang;", "|1&rang;", "(|0&rang; + |1&rang;)/&radic;2", "(|0&rang; + i|1&rang;)/&radic;2"], answer: 1, why: "R<sub>Y</sub>(&pi;)|0&rang; = cos(&pi;/2)|0&rang; + sin(&pi;/2)|1&rang; = |1&rang;." },
        { q: "Why rescale to [0, &pi;] instead of [0, 2&pi;]?", options: ["Hardware only allows angles up to &pi;", "So the minimum and maximum do not end up as the same state", "It makes the circuit shallower", "It is required for entanglement"], answer: 1, why: "R<sub>Y</sub>(2&pi;)|0&rang; = &minus;|0&rang;, which is physically the same state as R<sub>Y</sub>(0)|0&rang;. The two extremes would become indistinguishable." },
        { q: "Does angle encoding (as used here) create entanglement?", options: ["Yes, always", "Only with more than 2 qubits", "No: each gate acts on one qubit", "Only for large angles"], answer: 2, why: "Single-qubit gates on a product state give a product state. That is why every Bloch vector has length 1." },
      ],
      qiskit: `import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

x = np.array([6.2, 3.5])                 # sugar, firmness (0-10)
theta = np.pi * (x - 0) / (10 - 0)       # min-max scale to [0, pi]

qc = QuantumCircuit(2)
for i, t in enumerate(theta):
    qc.ry(t, i)

print(Statevector(qc).probabilities_dict(decimals=3))`,
      takeaway: "Angle encoding is the workhorse of near-term QML: shallow, hardware-friendly and smooth. It uses one qubit per feature and gives a simple kernel that a classical computer evaluates just as easily.",
    },

    phase: {
      num: 3,
      tagline: "Hide the data in relative phases: periodic by design.",
      hook: "A coastal weather station issues fog alerts when a northerly wind blows at night. Wind direction and time of day both go round in circles, and a good encoding should know that 359&deg; is right next to 1&deg;.",
      bigIdea: "Park each qubit on the equator of the Bloch sphere, then <b>spin it around</b> by the feature. A full turn brings it back: the encoding is periodic.",
      analogy: "Like the hand of a clock: 23:59 and 00:01 are neighbours on the dial even though the numbers are far apart.",
      formula: "|x&rang; = &otimes;<sub>i</sub> P(&phi;<sub>i</sub>) H|0&rang; = &otimes;<sub>i</sub> (|0&rang; + e<sup>i&phi;<sub>i</sub></sup>|1&rang;)/&radic;2, &nbsp; &phi;<sub>i</sub> = 2&pi;&middot;(x<sub>i</sub> &minus; min)/(max &minus; min)",
      formulaParts: [
        ["H", "Hadamard: puts the qubit on the equator, (|0&rang; + |1&rang;)/&radic;2"],
        ["P(&phi;)", "phase gate: multiplies the |1&rang; part by e<sup>i&phi;</sup>"],
        ["2&pi;", "one full turn = one full cycle of the feature"],
      ],
      useWhen: ["Angles, directions, times of day, seasons", "Any periodic quantity", "Data where wrap-around matters"],
      data: "Fog alerts sit in the four corners of the raw plot (near 0&deg;/360&deg; and 0 h/24 h). On a torus those corners are one region, and phase encoding sees the torus.",
      prep: "Map one full cycle of each feature (360&deg;, 24 h) to one full turn 2&pi;. The phase factor e<sup>i&phi;</sup> = cos &phi; + i sin &phi; is what the qubit stores.",
      circuit: "First the Hadamards put both qubits on the equator, then each P(&phi;) rotates its qubit around the Z axis. Watch the Bloch vectors spin around the equator.",
      measure: "In the Z basis every outcome has probability exactly 0.25, whatever the data. The information is all in the phases. Switch to the X basis and the probabilities suddenly depend on the wind and the hour.",
      kernel: "k(x, x&prime;) = &prod;<sub>i</sub> cos&sup2;((&phi;<sub>i</sub> &minus; &phi;&prime;<sub>i</sub>)/2), now periodic: 2&deg; and 358&deg; are almost identical states.",
      classify: "The linear baseline cannot join up the four corners. The periodic quantum kernel can.",
      tries: {
        data: "Notice the orange squares in all four corners: one weather pattern, split by the axis cut.",
        prep: "Set the wind to 359&deg;, then 1&deg;, and compare the phase factors.",
        circuit: "Step past the Hadamards: the state table shows four equal amplitudes, then the P gates rotate their phases.",
        measure: "Run shots in Z and then in X for the same input, and compare.",
        kernel: "Choose &ldquo;wind direction&rdquo; under <i>Vary</i>: the curve is periodic, so k climbs back up as B&rsquo;s direction approaches 360&deg;.",
      },
      deeper: {
        idea: "P(&phi;) = diag(1, e<sup>i&phi;</sup>) equals R<sub>Z</sub>(&phi;) up to a global phase. All information sits in relative phases, which a computational-basis measurement cannot see: one has to interfere amplitudes first, e.g. with a final H layer (an X-basis measurement), where P(+) = cos&sup2;(&phi;/2).",
        kernel: "&lang;&psi;(x)|&psi;(x&prime;)&rang; = &prod;<sub>i</sub> (1 + e<sup>i(&phi;&prime;<sub>i</sub>&minus;&phi;<sub>i</sub>)</sup>)/2, so k = &prod;<sub>i</sub> cos&sup2;((&phi;<sub>i</sub>&minus;&phi;&prime;<sub>i</sub>)/2) = &prod;<sub>i</sub> (1 + cos &Delta;&phi;<sub>i</sub>)/2: a kernel on the torus T<sup>n</sup>, the quantum analogue of a periodic (von Mises-type) kernel.",
      },
      quiz: [
        { q: "After phase encoding two qubits, what is P(|00&rang;) in the Z basis?", options: ["Always 0.25", "Depends on the wind", "Always 1", "Always 0"], answer: 0, why: "Each qubit is (|0&rang; + e<sup>i&phi;</sup>|1&rang;)/&radic;2: magnitude 1/&radic;2 on both outcomes, whatever &phi; is." },
        { q: "Wind 359&deg; and wind 1&deg; at the same hour: the kernel value is close to&hellip;", options: ["0", "0.5", "1", "&minus;1"], answer: 2, why: "&Delta;&phi; = 2&deg;, so k = cos&sup2;(1&deg;) &asymp; 0.9997. The encoding wraps around." },
        { q: "How can a measurement reveal the encoded phase?", options: ["Measure more shots in Z", "Apply H before measuring (X basis)", "Add more qubits", "It cannot"], answer: 1, why: "H turns phase differences into amplitude differences: P(+) = cos&sup2;(&phi;/2)." },
      ],
      qiskit: `import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

wind_deg, hour = 350.0, 2.5
phi = [2 * np.pi * wind_deg / 360, 2 * np.pi * hour / 24]

qc = QuantumCircuit(2)
qc.h([0, 1])
for i, p in enumerate(phi):
    qc.p(p, i)

print(Statevector(qc).probabilities_dict(decimals=3))   # all 0.25: info is in phases
qc.h([0, 1])                                  # measure in the X basis instead
print(Statevector(qc).probabilities_dict(decimals=3))`,
      takeaway: "Phase encoding is the natural choice for angles, times and other periodic quantities. Remember that a plain Z-basis measurement cannot see the encoded data: you must interfere first.",
    },

    amplitude: {
      num: 4,
      tagline: "Store N numbers in the amplitudes of log<sub>2</sub>N qubits.",
      hook: "A camera produces tiny 4&times;4 grey-scale images of bars. Sixteen numbers per image would cost 16 qubits with angle encoding, but amplitude encoding needs only 4.",
      bigIdea: "Use the data vector itself as the list of <span class=\"term\">amplitude</span>s: pixel i becomes the amplitude of basis state |i&rang;.",
      analogy: "Like pouring a fixed amount of water into 16 glasses: the image decides how full each glass is, and the total is always one jug.",
      formula: "|x&rang; = (1/&Vert;x&Vert;) &Sigma;<sub>i=0</sub><sup>N&minus;1</sup> x<sub>i</sub> |i&rang;, &nbsp; N = 2<sup>n</sup> values on n qubits",
      formulaParts: [
        ["x<sub>i</sub>", "the i-th pixel intensity"],
        ["&Vert;x&Vert;", "the vector length, so the probabilities sum to 1"],
        ["|i&rang;", "basis state whose binary label is the pixel index"],
      ],
      useWhen: ["High-dimensional vectors, images, spectra", "Few qubits available", "Algorithms that need |x&rang; as input (HHL, distance estimation)"],
      data: "Images are long vectors of non-negative intensities. 16 pixels fit on 4 qubits; a 1-megapixel image would need only 20.",
      prep: "Divide the vector by its length &Vert;x&Vert; so that the squares sum to 1. That normalised vector is the state.",
      circuit: "A binary tree of rotations: qubit 0 splits the mass between the top and bottom half of the image, qubit 1 splits each half again, and so on. Controls (&#9679; = 1, &#9675; = 0) choose which branch each rotation acts on.",
      measure: "P(i) = x<sub>i</sub>&sup2;/&Vert;x&Vert;&sup2;: the probability histogram <b>is</b> the image (squared). With few shots you get a noisy photo.",
      kernel: "k(x, x&prime;) = (x&middot;x&prime; / &Vert;x&Vert;&Vert;x&prime;&Vert;)&sup2;: the squared cosine similarity of the two images.",
      classify: "Bars in the same direction overlap strongly, so each class forms bright blocks in the kernel matrix.",
      tries: {
        data: "Compare a horizontal bar on row 0 with one on row 2: they barely overlap.",
        prep: "Make a pixel brighter and watch &Vert;x&Vert; and every amplitude change.",
        circuit: "Count the gates: 15 controlled rotations for 4 qubits, about N for N pixels.",
        measure: "Run 10 shots, then 10,000, and compare the rebuilt image with the original.",
        kernel: "Compare two horizontal bars on the same row, then two on different rows: same class does not always mean similar.",
      },
      deeper: {
        idea: "State preparation follows M&ouml;tt&ouml;nen et al. (2004): for real non-negative amplitudes, level k uses 2<sup>k</sup> uniformly controlled R<sub>Y</sub> rotations with &theta; = 2 arctan(&radic;(mass of right half)/&radic;(mass of left half)). In total 2<sup>n</sup> &minus; 1 rotations, so O(N) gates and O(N) depth after compiling the multi-controls. Signs are fixed by a final diagonal gate. QRAM-style loaders could reduce the depth to O(log N) but need O(N) qubits or hardware we do not have yet.",
        kernel: "k(x, x&prime;) = |&lang;x|x&prime;&rang;|&sup2; = cos&sup2;&ang;(x, x&prime;): a polynomial (degree-2, homogeneous) kernel on the unit sphere. It is cheap classically too; the interest of amplitude encoding lies in algorithms that process |x&rang; in time poly(log N), not in this kernel.",
      },
      quiz: [
        { q: "How many qubits does amplitude encoding need for a 32&times;32 image (1024 pixels)?", options: ["10", "32", "1024", "5"], answer: 0, why: "2<sup>10</sup> = 1024 amplitudes, so 10 qubits." },
        { q: "An image x and a twice-as-bright copy 2x are encoded as&hellip;", options: ["Orthogonal states", "The same state", "States with kernel 0.5", "States on different qubits"], answer: 1, why: "Normalising divides by &Vert;x&Vert;, so 2x/&Vert;2x&Vert; = x/&Vert;x&Vert;. The overall scale is lost." },
        { q: "What is the main practical cost of amplitude encoding?", options: ["Too many qubits", "Deep state-preparation circuits: O(N) gates", "It cannot store negative numbers", "It needs a Hamiltonian"], answer: 1, why: "Compactness in qubits is paid for in circuit depth: an arbitrary state needs about N rotations, many multi-controlled." },
      ],
      qiskit: `import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

img = np.random.rand(4, 4)              # any 4x4 grey-scale image
x = img.flatten() / np.linalg.norm(img)

qc = QuantumCircuit(4)
qc.initialize(x, range(4))              # Qiskit builds the rotation tree

# Qiskit's qubit 0 is the least significant bit of the index i.
probs = Statevector(qc).probabilities()
print(np.allclose(probs, x**2))         # True`,
      takeaway: "Amplitude encoding gives exponential compression and a cosine-similarity kernel, but preparing an arbitrary state needs deep circuits and loses the vector's norm.",
    },

    hamiltonian: {
      num: 5,
      tagline: "Let the data be the physics: encode x as the time evolution e<sup>&minus;iH(x)t</sup>.",
      hook: "A materials lab measures magnets described by two numbers: how strongly neighbouring spins align (J) and how hard an external field flips them (h). Is a given magnet ordered or disordered?",
      bigIdea: "Do not invent a circuit: build the <span class=\"term\">Hamiltonian</span> from the data and let the qubits evolve under it. The final state is the encoding.",
      analogy: "Like recording a short video of the magnet: you do not describe J and h, you let the system move under them and keep the result.",
      formula: "|x&rang; = e<sup>&minus;iH(J,h)t</sup> |+&rang;<sup>&otimes;3</sup>, &nbsp; H(J, h) = &minus;J &Sigma;<sub>i</sub> Z<sub>i</sub>Z<sub>i+1</sub> &minus; h &Sigma;<sub>i</sub> X<sub>i</sub>",
      formulaParts: [
        ["&minus;J Z<sub>i</sub>Z<sub>i+1</sub>", "coupling: rewards neighbouring spins that agree"],
        ["&minus;h X<sub>i</sub>", "transverse field: flips spins"],
        ["e<sup>&minus;iHt</sup>", "time evolution for time t = 1, done with 2 <span class=\"term\">Trotterisation</span> steps"],
      ],
      useWhen: ["Physical parameters (couplings, fields, bond lengths)", "Quantum chemistry and materials data", "Time-series generated by a known dynamics"],
      data: "Each magnet is (J, h). Physics says it is ordered when h &lt; J and disordered when h &gt; J (the transverse-field Ising transition). The features <i>are</i> Hamiltonian parameters.",
      prep: "No rescaling: J and h go straight into the Hamiltonian. The circuit needs their products with the time step, which become gate angles.",
      circuit: "Hadamards make |+++&rang;. Each Trotter step then applies ZZ rotations (coupling) and X rotations (field). Watch the Bloch vectors shrink: the dynamics creates <span class=\"term\">entanglement</span>.",
      measure: "Starting from |+++&rang;, the coupling alone only adds phases and the field alone changes nothing (|+&rang; is its eigenstate), so with only one of them the Z-basis histogram is flat. Structure appears when both act: J = 1.2, h = 0.6 piles about 40% each onto the aligned outcomes |000&rang; and |111&rang;, while h &gt; J leaves it nearly flat.",
      kernel: "No closed form here: the kernel needs the full simulated state. This is where a quantum computer could help, since simulating many spins classically gets exponentially expensive.",
      classify: "The decision boundary lines up with the physical phase transition h = J.",
      tries: {
        data: "Find magnets close to the diagonal h = J: they are the hardest to classify.",
        prep: "Set J = 0: the ZZ angles vanish.",
        circuit: "With J = 0 step through all gates: the state stays |+++&rang;, because |+&rang; is an eigenstate of X.",
        measure: "Compare J = 1.2, h = 0.6 (ordered) with J = 0.6, h = 1.2 (disordered) in the Z basis. Then set h = 0 and switch to the X basis: the phases from J become visible.",
        kernel: "Pick two magnets on the same side of h = J and two on opposite sides.",
      },
      deeper: {
        idea: "With H = A + B, A = &minus;J&Sigma;Z<sub>i</sub>Z<sub>i+1</sub>, B = &minus;h&Sigma;X<sub>i</sub>, the first-order Lie&ndash;Trotter formula gives e<sup>&minus;iHt</sup> &asymp; (e<sup>&minus;iA&Delta;t</sup>e<sup>&minus;iB&Delta;t</sup>)<sup>r</sup> with error O(t&sup2;&Vert;[A,B]&Vert;/r). e<sup>&minus;iA&Delta;t</sup> = &prod; RZZ(&minus;2J&Delta;t) and e<sup>&minus;iB&Delta;t</sup> = &prod; RX(&minus;2h&Delta;t). Here t = 1, r = 2, &Delta;t = 0.5; the encoding is the Trotterised circuit itself, so it is exactly what a device would run.",
        kernel: "k(x, x&prime;) = |&lang;+|<sup>&otimes;n</sup> U(x)<sup>&dagger;</sup>U(x&prime;)|+&rang;<sup>&otimes;n</sup>|&sup2; is a Loschmidt-echo-like overlap. For general n it requires simulating 2<sup>n</sup> amplitudes; Hamiltonian embeddings of this kind are studied as physically motivated kernels (e.g. Shaydulin &amp; Wild 2022; Huang et al. 2021 on projected kernels).",
      },
      quiz: [
        { q: "In H(J, h), which term can create entanglement?", options: ["The field &minus;h X<sub>i</sub>", "The coupling &minus;J Z<sub>i</sub>Z<sub>i+1</sub>", "The Hadamards", "None of them"], answer: 1, why: "Only the two-qubit ZZ terms act on pairs of qubits; single-qubit terms cannot entangle." },
        { q: "What does Trotterisation do?", options: ["Measures the energy", "Approximates e<sup>&minus;i(A+B)t</sup> by alternating short steps of A and B", "Normalises the data", "Removes noise"], answer: 1, why: "A and B do not commute, so we split the evolution into short alternating steps. More steps give a smaller error." },
        { q: "With J = 0 (no coupling), the encoded state is&hellip;", options: ["Maximally entangled", "Still |+++&rang;", "|000&rang;", "Random"], answer: 1, why: "Only X rotations act, and |+&rang; is an eigenstate of X, so they add only a global phase." },
      ],
      qiskit: `from qiskit import QuantumCircuit
from qiskit.circuit.library import PauliEvolutionGate
from qiskit.quantum_info import SparsePauliOp, Statevector
from qiskit.synthesis import LieTrotter

J, h, t = 1.2, 0.6, 1.0
H = SparsePauliOp.from_list([
    ("ZZI", -J), ("IZZ", -J),                 # coupling
    ("XII", -h), ("IXI", -h), ("IIX", -h),    # transverse field
])

qc = QuantumCircuit(3)
qc.h(range(3))                                # |+++>
qc.append(PauliEvolutionGate(H, time=t, synthesis=LieTrotter(reps=2)), range(3))

trotter = qc.decompose()          # the actual RZZ / RX gates a device would run
print(Statevector(trotter).probabilities_dict(decimals=3))
# Statevector(qc) without decompose() uses the exact exp(-iHt) instead:
# comparing the two shows the Trotter error.`,
      takeaway: "Hamiltonian encoding links QML to quantum simulation and is natural for physics and chemistry data. The design choices are the Hamiltonian, the evolution time and the Trotter depth.",
    },

    iqp: {
      num: 6,
      tagline: "Hadamards around a diagonal layer whose phases contain products of features.",
      hook: "A toy but famous problem: points are labelled by whether x<sub>1</sub> and x<sub>2</sub> have the same sign (XOR). No straight line can separate them, because the label depends on how the features interact.",
      bigIdea: "Put single features <b>and their products</b> into phases between Hadamard layers. The products give the model interaction terms; the Hadamards turn phases into interference.",
      analogy: "Like a recipe where two ingredients only matter in combination: the ZZ gate is where they meet.",
      formula: "|x&rang; = (U<sub>Z</sub>(x) H<sup>&otimes;n</sup>)<sup>reps</sup>|0&rang;, &nbsp; U<sub>Z</sub>(x) = &prod;<sub>i</sub> R<sub>Z</sub>(2x<sub>i</sub>) &prod;<sub>i&lt;j</sub> ZZ(2(&pi;&minus;x<sub>i</sub>)(&pi;&minus;x<sub>j</sub>))",
      formulaParts: [
        ["R<sub>Z</sub>(2x<sub>i</sub>)", "phase from a single feature"],
        ["ZZ(2(&pi;&minus;x<sub>i</sub>)(&pi;&minus;x<sub>j</sub>))", "phase from a <b>product</b> of two features: the interaction term"],
        ["reps", "how often the block repeats (Havl&iacute;&ccaron;ek et al. use 2)"],
      ],
      useWhen: ["Features that interact (XOR-like structure)", "Quantum kernel methods / QSVM", "Studies of quantum advantage"],
      data: "In XOR data the class is the sign of x<sub>1</sub>&middot;x<sub>2</sub>. IQP's ZZ phase contains exactly such a product.",
      prep: "Rescale each feature to x &isin; [0, &pi;]. The single-qubit angles are 2x<sub>i</sub>; the ZZ angle is 2(&pi;&minus;x<sub>1</sub>)(&pi;&minus;x<sub>2</sub>).",
      circuit: "Hadamards create a uniform superposition, R<sub>Z</sub> gates add feature phases, and the ZZ gate adds the interaction phase. Watch the Bloch vectors shrink at the ZZ gate: that is entanglement appearing.",
      measure: "With reps = 1 every Z-basis outcome has probability 0.25 (only phases change), just like phase encoding. The X basis, or reps = 2, reveals the structure.",
      kernel: "No simple closed form once the ZZ term is in: the kernel mixes single features and their product, which is why it can bend around XOR.",
      classify: "The linear baseline is near chance on XOR; the IQP kernel captures the interaction. Try reps = 2 to see what over-expressivity does.",
      tries: {
        data: "Notice that the classes form a 2&times;2 chessboard.",
        prep: "Set x1 to its maximum: (&pi; &minus; x<sub>0</sub>) becomes 0, so the interaction angle vanishes.",
        circuit: "Look at the Bloch vector lengths before and after the ZZ gate.",
        measure: "Switch reps to 2 in step 7 and come back: the Z-basis histogram is no longer flat.",
        kernel: "Move B across x<sub>2</sub> = 0 and watch the similarity curve.",
      },
      deeper: {
        idea: "IQP = Instantaneous Quantum Polynomial time: circuits of the form H<sup>&otimes;n</sup> D H<sup>&otimes;n</sup> with D diagonal. Sampling their output distribution is classically hard unless the polynomial hierarchy collapses (Bremner, Jozsa &amp; Shepherd 2011). Havl&iacute;&ccaron;ek et al. (Nature 2019) used U<sub>&Phi;</sub>(x) = (U<sub>Z</sub>(x)H<sup>&otimes;n</sup>)<sup>2</sup> as a feature map for a quantum kernel SVM. Qiskit's ZZFeatureMap implements the same circuit with P gates, which differ from R<sub>Z</sub> only by a global phase.",
        kernel: "With one repetition, |&psi;(x)&rang; = 2<sup>&minus;n/2</sup> &Sigma;<sub>z</sub> e<sup>i f(x,z)</sup>|z&rang; where f contains x<sub>i</sub>z<sub>i</sub> and (&pi;&minus;x<sub>i</sub>)(&pi;&minus;x<sub>j</sub>)z<sub>i</sub>z<sub>j</sub> terms (z<sub>i</sub> = &plusmn;1). The kernel |2<sup>&minus;n</sup>&Sigma;<sub>z</sub> e<sup>i[f(x&prime;,z) &minus; f(x,z)]</sup>|&sup2; is a squared Fourier sum. With more qubits and repetitions such kernels can <b>concentrate</b>: all off-diagonal values approach 0 exponentially fast (Thanasilp et al. 2022).",
      },
      quiz: [
        { q: "Which gate brings the feature product into the circuit?", options: ["H", "R<sub>Z</sub>(2x<sub>1</sub>)", "ZZ(2(&pi;&minus;x<sub>1</sub>)(&pi;&minus;x<sub>2</sub>))", "Measurement"], answer: 2, why: "Its angle multiplies a function of x<sub>1</sub> by a function of x<sub>2</sub>: the interaction term XOR needs." },
        { q: "On our XOR data, going from reps = 1 to reps = 2&hellip;", options: ["Improves test accuracy", "Lowers test accuracy from about 94% to 71%", "Makes no difference", "Breaks the circuit"], answer: 1, why: "The more expressive map fits the training data in a more irregular way: a small-data case of <span class=\"term\">overfitting</span>." },
        { q: "Why are IQP circuits interesting for quantum advantage?", options: ["They are very deep", "Sampling their outputs is believed to be classically hard", "They need no entanglement", "They are error-free"], answer: 1, why: "Even though they are shallow, simulating their output distribution efficiently would collapse the polynomial hierarchy." },
      ],
      qiskit: `import numpy as np
from qiskit.circuit.library import zz_feature_map
from qiskit.quantum_info import Statevector

fm = zz_feature_map(feature_dimension=2, reps=1)   # Havlicek et al. used reps=2

def state(x):                                      # x already scaled to [0, pi]
    return Statevector(fm.assign_parameters(x))

a, b = np.array([0.4, 2.5]), np.array([0.5, 2.4])
k = abs(state(a).inner(state(b))) ** 2             # fidelity quantum kernel
print(round(k, 4))`,
      takeaway: "IQP / ZZ feature maps are the standard choice for quantum kernel methods: entangling, non-linear and hard to simulate at scale. Watch out for overfitting and, with many qubits, kernel concentration.",
    },
  };

  // ------------------------------------------------------------ live worked calculations for step 3
  const WORKED = {
    basis(raw, x, ds) {
      return `<table class="calc">${ds.feature_names.map((name, i) =>
        `<tr><td>${name}</td><td>= ${x[i]}</td><td>&rarr; ${x[i] ? `X on q${i} &rarr; |1&rang;` : `leave q${i} as |0&rang;`}</td></tr>`).join("")}</table>
        <p class="calc-result">|x&rang; = |${x.join("")}&rang; &nbsp; (basis state number ${parseInt(x.join(""), 2)} of 16)</p>`;
    },
    angle(raw, x, ds) {
      const rows = x.map((t, i) => {
        const [a, b] = ds.feature_ranges[i];
        return `<tr><td>${ds.feature_names[i]}</td><td>&theta;<sub>${i}</sub> = &pi; &middot; (${f(raw[i], 2)} &minus; ${a}) / (${b} &minus; ${a}) = <b>${f(t)}</b> rad (${deg(t)})</td></tr>
          <tr><td></td><td class="sub">q${i} = cos(${f(t / 2)})|0&rang; + sin(${f(t / 2)})|1&rang; = <b>${f(Math.cos(t / 2))}</b>|0&rang; + <b>${f(Math.sin(t / 2))}</b>|1&rang;</td></tr>`;
      }).join("");
      const [c0, s0, c1, s1] = [Math.cos(x[0] / 2), Math.sin(x[0] / 2), Math.cos(x[1] / 2), Math.sin(x[1] / 2)];
      return `<table class="calc">${rows}</table>
        <p class="calc-result">|x&rang; = q0 &otimes; q1 = ${f(c0 * c1)}|00&rang; + ${f(c0 * s1)}|01&rang; + ${f(s0 * c1)}|10&rang; + ${f(s0 * s1)}|11&rang;</p>`;
    },
    phase(raw, x, ds) {
      const rows = x.map((p, i) => {
        const [a, b] = ds.feature_ranges[i];
        return `<tr><td>${ds.feature_names[i]}</td><td>&phi;<sub>${i}</sub> = 2&pi; &middot; (${f(raw[i], 2)} &minus; ${a}) / (${b} &minus; ${a}) = <b>${f(p)}</b> rad (${deg(p)})</td></tr>
          <tr><td></td><td class="sub">e<sup>i&phi;<sub>${i}</sub></sup> = cos &phi; + i sin &phi; = <b>${f(Math.cos(p))} ${Math.sin(p) < 0 ? "&minus;" : "+"} ${f(Math.abs(Math.sin(p)))}i</b></td></tr>`;
      }).join("");
      return `<table class="calc">${rows}</table>
        <p class="calc-result">|x&rang; = &frac12; (|00&rang; + e<sup>i&phi;<sub>1</sub></sup>|01&rang; + e<sup>i&phi;<sub>0</sub></sup>|10&rang; + e<sup>i(&phi;<sub>0</sub>+&phi;<sub>1</sub>)</sup>|11&rang;): every magnitude is &frac12;</p>`;
    },
    amplitude(raw, x) {
      const norm = Math.hypot(...raw);
      const sq = raw.map((v) => v * v);
      const top = raw.map((v, i) => [v, i]).sort((p, q) => q[0] - p[0]).slice(0, 4);
      return `<table class="calc">
        <tr><td>&Vert;x&Vert;&sup2;</td><td>= ${sq.slice(0, 4).map((v) => f(v, 2)).join(" + ")} + &hellip; (16 terms) = <b>${f(norm * norm)}</b></td></tr>
        <tr><td>&Vert;x&Vert;</td><td>= <b>${f(norm)}</b></td></tr>
        ${top.map(([v, i]) => `<tr><td>pixel ${i}</td><td>${f(v, 2)} / ${f(norm)} = amplitude <b>${f(x[i])}</b> of |${i.toString(2).padStart(4, "0")}&rang;, P = ${f(x[i] * x[i])}</td></tr>`).join("")}
        </table>
        <p class="calc-result">Check: &Sigma; amplitude&sup2; = ${f(x.reduce((s, a) => s + a * a, 0))} (the four brightest pixels are shown)</p>`;
    },
    hamiltonian(raw, x) {
      const [J, h] = x, dt = 0.5;
      return `<table class="calc">
        <tr><td>coupling J</td><td>= <b>${f(J, 2)}</b></td></tr>
        <tr><td>field h</td><td>= <b>${f(h, 2)}</b> &nbsp; (${h > J ? "h &gt; J: disordered side" : "h &lt; J: ordered side"})</td></tr>
        <tr><td>time step</td><td>&Delta;t = t / r = 1 / 2 = ${dt}</td></tr>
        <tr><td>ZZ angle</td><td>e<sup>+iJ&Delta;t ZZ</sup> = ZZ(&minus;2J&Delta;t) = ZZ(<b>${f(-2 * J * dt)}</b>)</td></tr>
        <tr><td>X angle</td><td>e<sup>+ih&Delta;t X</sup> = R<sub>X</sub>(&minus;2h&Delta;t) = R<sub>X</sub>(<b>${f(-2 * h * dt)}</b>)</td></tr></table>
        <p class="calc-result">H = &minus;${f(J, 2)}(Z<sub>0</sub>Z<sub>1</sub> + Z<sub>1</sub>Z<sub>2</sub>) &minus; ${f(h, 2)}(X<sub>0</sub> + X<sub>1</sub> + X<sub>2</sub>)</p>`;
    },
    iqp(raw, x, ds) {
      const zz = 2 * (PI - x[0]) * (PI - x[1]);
      return `<table class="calc">${x.map((v, i) => {
        const [a, b] = ds.feature_ranges[i];
        return `<tr><td>${ds.feature_names[i]}</td><td>x<sub>${i}</sub> = &pi; &middot; (${f(raw[i], 2)} &minus; (${a})) / (${b} &minus; (${a})) = <b>${f(v)}</b> &nbsp;&rarr;&nbsp; R<sub>Z</sub>(2x<sub>${i}</sub>) = R<sub>Z</sub>(${f(2 * v)})</td></tr>`;
      }).join("")}
        <tr><td>interaction</td><td>2(&pi; &minus; ${f(x[0])})(&pi; &minus; ${f(x[1])}) = 2 &times; ${f(PI - x[0])} &times; ${f(PI - x[1])} = <b>${f(zz)}</b></td></tr></table>
        <p class="calc-result">The ZZ angle depends on both features at once: that is the interaction term XOR needs.</p>`;
    },
  };

  // ------------------------------------------------------------ closed-form kernels for step 6 (null = needs simulation)
  const CLOSED_FORM = {
    basis: (a, b) => ({ value: a.join("") === b.join("") ? 1 : 0, html: `&delta;(|${a.join("")}&rang;, |${b.join("")}&rang;) = ${a.join("") === b.join("") ? 1 : 0}` }),
    angle: (a, b) => {
      const parts = a.map((t, i) => Math.cos((t - b[i]) / 2) ** 2);
      return { value: parts.reduce((p, v) => p * v, 1), html: parts.map((v, i) => `cos&sup2;((${f(a[i])} &minus; ${f(b[i])})/2) = ${f(v)}`).join(" &times; ") };
    },
    phase: (a, b) => {
      const parts = a.map((t, i) => Math.cos((t - b[i]) / 2) ** 2);
      return { value: parts.reduce((p, v) => p * v, 1), html: parts.map((v, i) => `cos&sup2;((${f(a[i])} &minus; ${f(b[i])})/2) = ${f(v)}`).join(" &times; ") };
    },
    amplitude: (a, b) => {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      return { value: dot * dot, html: `(x&#770;<sub>A</sub> &middot; x&#770;<sub>B</sub>)&sup2; = (${f(dot)})&sup2;` };
    },
    hamiltonian: null,
    iqp: null,
  };

  // ------------------------------------------------------------ "which encoding?" chooser on the overview
  const CHOOSER = [
    { label: "Yes/no or categorical values", enc: "basis" },
    { label: "A few bounded numbers (sensors, scores)", enc: "angle" },
    { label: "Angles, directions, times of day", enc: "phase" },
    { label: "Long vectors or images, few qubits", enc: "amplitude" },
    { label: "Physical parameters of a system", enc: "hamiltonian" },
    { label: "Features that interact (XOR-like)", enc: "iqp" },
  ];

  window.CONTENT = CONTENT;
  window.GLOSSARY = GLOSSARY;
  window.WORKED = WORKED;
  window.CLOSED_FORM = CLOSED_FORM;
  window.CHOOSER = CHOOSER;
})();
