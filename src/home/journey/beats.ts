import type { Beat } from './types';

/* The journey, bottom-up: 25 stations from the silicon to the page you are
   reading. Prose is the site's voice — Spanish; ids and layer names are not. */

const HARDWARE: Beat[] = [
  {
    id: 'despiece',
    layer: 'HARDWARE',
    kicker: 'la materia',
    title: 'Una máquina, desarmada',
    lede: 'Unos gramos de silicio, cobre y plástico. Nada de lo que se estudia en este sitio existe sin lo que hay aquí abajo.',
    hint: 'Enter · monta la máquina',
    figure: { kind: 'board', mark: 0.02, explode: 1 },
  },
  {
    id: 'ensamblaje',
    layer: 'HARDWARE',
    pushes: true,
    kicker: 'el ensamblaje',
    title: 'Cada pieza encuentra su sitio',
    lede: 'Un computador no es un bloque: es un montaje de capas que se apoyan unas en otras. Esta es la primera, la única que puedes tocar.',
    figure: { kind: 'board', mark: 1, explode: 0 },
  },
  {
    id: 'bit',
    layer: 'HARDWARE',
    kicker: 'el bit',
    title: 'Un voltaje que decide',
    lede: 'Esta pista lleva un byte del procesador a la memoria. Dentro del cobre no hay ceros ni unos: hay tensión. La sonda mide lo que pasa por ese punto, y por encima del umbral la máquina lo llama 1.',
    chips: ['arquitectura-cpu'],
    figure: { kind: 'board', mark: 1, explode: 0, panel: 'probe' },
  },
  {
    id: 'puerta',
    layer: 'HARDWARE',
    kicker: 'la puerta',
    title: 'Un interruptor que abre otro interruptor',
    lede: 'Bajo la tapa hay miles de millones de estos. La tensión en la puerta forma el canal, y solo entonces pasa corriente. Cuatro puestos así deciden: es una NAND, y con NAND se construye todo lo demás.',
    hint: 'conmuta A y B',
    chips: ['logic', 'arquitectura-cpu'],
    figure: { kind: 'board', mark: 1, explode: 0, panel: 'gate' },
  },
  {
    id: 'reloj',
    layer: 'HARDWARE',
    kicker: 'el reloj',
    title: 'Todo pasa al ritmo del reloj',
    lede: 'El procesador da 3.400 millones de pulsos por segundo. En cada pulso, y solo ahí, las celdas copian lo que tienen a la entrada. Entre pulso y pulso los cables cambian y da igual: nadie está mirando. Así es como un circuito guarda un valor en vez de dejarlo pasar.',
    chips: ['arquitectura-cpu'],
    figure: { kind: 'timing' },
  },
  {
    id: 'ciclo',
    layer: 'HARDWARE',
    kicker: 'el ciclo',
    title: 'Buscar, decodificar, ejecutar',
    lede: 'El contador dice dónde mirar, la memoria devuelve 32 bits, y esos bits ya traen dentro qué operación es y sobre qué registros. La CPU no interpreta un programa: recorre este camino y vuelve a empezar.',
    chips: ['arquitectura-cpu'],
    figure: { kind: 'datapath' },
  },
  {
    id: 'memoria',
    layer: 'HARDWARE',
    kicker: 'la memoria',
    title: 'Cuanto más cerca, más cara',
    lede: 'Los registros y las cachés L1 y L2 son de un solo núcleo; la L3 la comparten los seis. Todo lo que hay más allá ya está fuera del chip — y de la memoria nunca llega un dato suelto: llegan 64 bytes de golpe.',
    chips: ['jerarquia-memoria'],
    figure: { kind: 'hierarchy' },
  },
];

const FIRMWARE: Beat[] = [
  {
    id: 'encendido',
    layer: 'FIRMWARE',
    pushes: true,
    kicker: 'el encendido',
    title: 'La máquina se busca a sí misma',
    lede: 'Al llegar la corriente la CPU no sabe nada: ejecuta una dirección fija donde vive el firmware, que cuenta la memoria, despierta los dispositivos y busca algo que arrancar.',
    chips: ['arquitectura-cpu', 'drivers-io'],
    figure: {
      kind: 'log',
      title: 'firmware · POST',
      xray: [
        { id: 'ram', label: 'memoria', bar: true, tone: 'mauve' },
        { id: 'dev', label: 'dispositivos', cells: 6, tone: 'blue' },
        { id: 'disk', label: 'arranque', cells: 3, tone: 'green' },
      ],
      lines: [
        { text: 'CPU0: reset vector 0xFFFFFFF0', gap: 0, scramble: true },
        { text: 'POST: memory test .......... 16384 MB OK', gap: 520, lights: 'ram' },
        { text: 'PCIe: enumerating devices', gap: 420 },
        { text: 'PCIe: 00:02.0 VGA · 00:14.0 USB · 00:17.0 SATA', gap: 90, lights: 'dev' },
        { text: 'NVMe: Samsung 990 PRO 1TB', gap: 380, lights: 'dev' },
        { text: 'Boot order: NVMe0 · USB · PXE', gap: 340, lights: 'disk' },
        { text: 'Reading boot sector ...', gap: 300, lights: 'disk' },
        { text: 'Handing over to /boot/EFI/grubx64.efi', gap: 320, tone: 'green', lights: 'disk' },
      ],
    },
  },
  {
    id: 'bootloader',
    layer: 'FIRMWARE',
    kicker: 'el bootloader',
    title: 'Alguien tiene que cargar el kernel',
    lede: 'El firmware no sabe leer tu sistema de ficheros. Carga un programa diminuto que sí sabe, y ese programa mete el kernel en memoria y le cede la máquina para siempre.',
    chips: ['kernel', 'sistemas-ficheros'],
    figure: {
      kind: 'bars',
      scale: 'la memoria física, mientras el bootloader trabaja',
      rows: [
        {
          label: '0x00000000',
          note: 'firmware y tablas',
          segments: [
            { label: 'firmware', w: 0.14, tone: 'peach' },
            { w: 0.86, hollow: true },
          ],
        },
        {
          label: '0x00100000',
          note: 'el bootloader se copia aquí',
          segments: [
            { w: 0.14, hollow: true },
            { label: 'grub', w: 0.1, tone: 'blue' },
            { w: 0.76, hollow: true },
          ],
        },
        {
          label: '0x01000000',
          note: 'el kernel y su initramfs',
          segments: [
            { w: 0.24, hollow: true },
            { label: 'vmlinuz', w: 0.3, tone: 'mauve' },
            { label: 'initramfs', w: 0.16, tone: 'teal' },
            { w: 0.3, hollow: true },
          ],
        },
      ],
    },
  },
];

const KERNEL: Beat[] = [
  {
    id: 'arranque',
    layer: 'KERNEL',
    pushes: true,
    kicker: 'el arranque',
    title: 'El kernel toca metal desnudo',
    lede: 'No hay nadie debajo. El kernel levanta sus propias abstracciones desde cero — memoria, procesos, drivers — y solo cuando están en pie puede existir un programa tuyo.',
    chips: ['kernel'],
    figure: {
      kind: 'log',
      title: 'tty0 · /dev/console',
      xray: [
        { id: 'cpu', label: 'núcleos', cells: 6, tone: 'green' },
        { id: 'mem', label: 'memoria', bar: true, tone: 'mauve' },
        { id: 'vfs', label: 'raíz montada', cells: 3, tone: 'blue' },
      ],
      lines: [
        { text: 'GRUB loading.', gap: 0, tone: 'muted', scramble: true },
        { text: 'Welcome to GRUB!', gap: 480, tone: 'muted', scramble: true },
        {
          text: '[    0.000000] Linux version 6.9.3-arch1-1 (gcc 14.1.1) #1 SMP PREEMPT_DYNAMIC',
          gap: 820,
          tone: 'green',
        },
        { text: '[    0.000000] Command line: root=UUID=3f2b-9c41 rw quiet', gap: 80 },
        { text: '[    0.041226] smpboot: Allowing 6 CPUs, 0 hotplug CPUs', gap: 440, lights: 'cpu' },
        { text: '[    0.052840] Memory: 16268516K/16659388K available', gap: 90, lights: 'mem' },
        { text: '[    0.211014] smp: Bringing up secondary CPUs ...', gap: 360, lights: 'cpu' },
        { text: '[    0.243402] smp: Brought up 1 node, 6 CPUs', gap: 240, lights: 'cpu' },
        { text: '[    0.688210] usb 1-1: new high-speed USB device number 2', gap: 400 },
        { text: '[    1.020331] EXT4-fs (nvme0n1p2): mounted filesystem', gap: 560, lights: 'vfs' },
        { text: '[    1.148002] VFS: Mounted root (ext4) readonly on device 259:2', gap: 90, lights: 'vfs' },
        { text: '[    1.190210] Freeing unused kernel image memory: 2624K', gap: 340, lights: 'mem' },
        { text: '[    1.191033] Run /sbin/init as init process', gap: 260, tone: 'green', lights: 'vfs' },
      ],
    },
  },
  {
    id: 'vmem',
    layer: 'KERNEL',
    kicker: 'la memoria virtual',
    title: 'Cada proceso cree que la memoria es suya',
    lede: 'La MMU traduce direcciones al vuelo con tablas de páginas. Por eso dos programas usan la dirección 0x400000 sin pisarse, y por eso un puntero suelto no derriba el sistema entero.',
    chips: ['sistemas-ficheros', 'kernel'],
    figure: {
      kind: 'flow',
      travel: ['virt', 'mmu', 'tabla', 'fis'],
      travelLabel: '0x400000',
      nodes: [
        { id: 'virt', label: 'dirección virtual', sub: 'lo que ve tu proceso', x: 60, y: 230, w: 210, tone: 'blue' },
        { id: 'mmu', label: 'MMU', sub: 'traduce, o falla', x: 330, y: 230, w: 150, tone: 'mauve' },
        { id: 'tabla', label: 'tabla de páginas', sub: 'una por proceso', x: 330, y: 60, w: 200, tone: 'muted' },
        { id: 'fis', label: 'marco físico', sub: 'la RAM de verdad', x: 560, y: 230, w: 190, tone: 'green' },
        { id: 'fault', label: 'page fault', sub: 'el kernel la trae del disco', x: 560, y: 400, w: 230, tone: 'peach' },
      ],
      edges: [
        { from: 'virt', to: 'mmu' },
        { from: 'mmu', to: 'tabla', label: 'consulta', dashed: true },
        { from: 'mmu', to: 'fis', label: 'acierto' },
        { from: 'mmu', to: 'fault', label: 'no está', dashed: true },
      ],
    },
  },
  {
    id: 'planificador',
    layer: 'KERNEL',
    kicker: 'el planificador',
    title: 'Nadie ejecuta a la vez',
    lede: 'Con seis núcleos y trescientos procesos, el reparto es una ilusión bien mantenida: el kernel guarda tu estado, mete el de otro y devuelve el control en microsegundos.',
    chips: ['procesos', 'concurrencia'],
    figure: {
      kind: 'cycle',
      center: 'runqueue',
      centerSub: 'quién toca ahora',
      steps: [
        { label: 'listo', sub: 'espera turno', tone: 'blue' },
        { label: 'corriendo', sub: 'ocupa un núcleo', tone: 'green' },
        { label: 'expulsado', sub: 'se acabó el quantum', tone: 'peach' },
        { label: 'dormido', sub: 'espera al disco', tone: 'mauve' },
      ],
    },
  },
  {
    id: 'interrupciones',
    layer: 'KERNEL',
    kicker: 'las interrupciones',
    title: 'El hardware no pide turno',
    lede: 'El teclado no espera a que le pregunten: levanta una línea, la CPU suelta lo que estaba haciendo y salta al manejador. Toda la entrada del sistema es esa cortesía.',
    hint: 'pulsa una tecla',
    chips: ['drivers-io', 'kernel'],
    figure: {
      kind: 'flow',
      travel: ['tecla', 'ctrl', 'cpu', 'driver', 'tty'],
      travelLabel: 'IRQ 1',
      nodes: [
        { id: 'tecla', label: 'tecla', sub: 'un contacto se cierra', x: 40, y: 250, w: 160, tone: 'peach' },
        { id: 'ctrl', label: 'controlador', sub: 'levanta la línea', x: 240, y: 250, w: 170, tone: 'blue' },
        { id: 'cpu', label: 'CPU', sub: 'suelta lo que hacía', x: 450, y: 250, w: 140, tone: 'mauve' },
        { id: 'driver', label: 'manejador', sub: 'lee el código', x: 630, y: 250, w: 160, tone: 'green' },
        { id: 'tty', label: 'tu programa', sub: 'recibe el carácter', x: 830, y: 250, w: 150, tone: 'ink' },
      ],
      edges: [
        { from: 'tecla', to: 'ctrl' },
        { from: 'ctrl', to: 'cpu', label: 'IRQ' },
        { from: 'cpu', to: 'driver', label: 'vector' },
        { from: 'driver', to: 'tty' },
      ],
    },
  },
  {
    id: 'vfs',
    layer: 'KERNEL',
    kicker: 'todo es un fichero',
    title: 'Un solo verbo para todo',
    lede: 'Discos, sockets, procesos y dispositivos se leen y se escriben con las mismas llamadas. El VFS es la capa que sostiene esa mentira, y es la mejor abstracción de Unix.',
    chips: ['sistemas-ficheros', 'kernel'],
    figure: {
      kind: 'tree',
      caption: 'open() no sabe si detrás hay un disco, una tarjeta de red o un proceso',
      root: {
        label: '/',
        sub: 'ext4 · nvme0n1p2',
        tone: 'mauve',
        children: [
          { label: 'boot/', sub: 'el kernel que arrancó' },
          {
            label: 'dev/',
            sub: 'los dispositivos, como ficheros',
            tone: 'blue',
            children: [
              { label: 'nvme0n1', sub: 'el disco entero' },
              { label: 'tty0', sub: 'esta consola' },
            ],
          },
          {
            label: 'proc/',
            sub: 'el kernel contándose a sí mismo',
            tone: 'teal',
            children: [{ label: '1/', sub: 'el primer proceso' }],
          },
          { label: 'home/', sub: 'lo tuyo', tone: 'green' },
        ],
      },
    },
  },
];

const SYSCALL: Beat[] = [
  {
    id: 'frontera',
    layer: 'SYSCALL',
    pushes: true,
    kicker: 'la frontera',
    title: 'Dos mundos y una puerta',
    lede: 'Tu programa no puede tocar el disco ni la red: pide. Una instrucción especial cruza a modo privilegiado, el kernel comprueba quién eres y responde. Esa puerta es el contrato del sistema.',
    chips: ['syscalls', 'seguridad-sistemas'],
    figure: {
      kind: 'flow',
      travel: ['prog', 'trap', 'disp', 'impl'],
      travelLabel: 'write(1, …)',
      bands: [
        { label: 'ring 3 · tu código', y: 120, h: 170, tone: 'blue' },
        { label: 'ring 0 · el kernel', y: 330, h: 190, tone: 'mauve' },
      ],
      nodes: [
        { id: 'prog', label: 'tu programa', sub: 'sin privilegios', x: 80, y: 175, w: 200, tone: 'blue' },
        { id: 'trap', label: 'syscall', sub: 'la instrucción que cruza', x: 400, y: 175, w: 220, tone: 'peach' },
        { id: 'disp', label: 'dispatcher', sub: 'comprueba y enruta', x: 400, y: 385, w: 220, tone: 'mauve' },
        { id: 'impl', label: 'sys_write', sub: 'lo hace de verdad', x: 700, y: 385, w: 200, tone: 'green' },
      ],
      edges: [
        { from: 'prog', to: 'trap' },
        { from: 'trap', to: 'disp', label: 'cambio de modo' },
        { from: 'disp', to: 'impl' },
      ],
    },
  },
  {
    id: 'libc',
    layer: 'SYSCALL',
    kicker: 'la biblioteca',
    title: 'Nadie llama al kernel a pelo',
    lede: 'printf no es una syscall: es libc formateando, amortiguando y, al final, pidiendo un write. Entre tu código y el kernel siempre hay una capa de conveniencia que conviene conocer.',
    chips: ['c23', 'syscalls'],
    figure: {
      kind: 'flow',
      travel: ['printf', 'buffer', 'write', 'kernel'],
      travelLabel: '"hola\\n"',
      nodes: [
        { id: 'printf', label: 'printf()', sub: 'formatea', x: 60, y: 240, w: 180, tone: 'blue' },
        { id: 'buffer', label: 'buffer de libc', sub: 'acumula hasta el salto', x: 290, y: 240, w: 220, tone: 'teal' },
        { id: 'write', label: 'write()', sub: 'el envoltorio fino', x: 560, y: 240, w: 170, tone: 'peach' },
        { id: 'kernel', label: 'sys_write', sub: 'ya en el kernel', x: 780, y: 240, w: 180, tone: 'mauve' },
        { id: 'malloc', label: 'malloc()', sub: 'y mmap/brk por debajo', x: 290, y: 420, w: 220, tone: 'muted' },
      ],
      edges: [
        { from: 'printf', to: 'buffer' },
        { from: 'buffer', to: 'write', label: 'al vaciar' },
        { from: 'write', to: 'kernel' },
        { from: 'printf', to: 'malloc', dashed: true, label: 'memoria' },
      ],
    },
  },
];

const USERSPACE: Beat[] = [
  {
    id: 'pid1',
    layer: 'USERSPACE',
    pushes: true,
    kicker: 'el primer proceso',
    title: 'De uno salen todos',
    lede: 'El kernel arranca un único programa, y ese hace fork de los demás. Todo lo que corre en tu máquina desciende del PID 1, como un árbol genealógico sin excepciones.',
    chips: ['procesos'],
    figure: {
      kind: 'tree',
      caption: 'fork() duplica un proceso; exec() cambia su programa sin cambiar su identidad',
      root: {
        label: 'systemd',
        sub: 'pid 1',
        tone: 'mauve',
        children: [
          { label: 'udevd', sub: 'los dispositivos', tone: 'blue' },
          { label: 'sshd', sub: 'escucha el puerto 22' },
          {
            label: 'login',
            sub: 'te identifica',
            children: [
              {
                label: 'sh',
                sub: 'pid 214 · tu turno',
                tone: 'green',
                children: [{ label: 'ls', sub: 'nace y muere en 3 ms' }],
              },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'shell',
    layer: 'USERSPACE',
    kicker: 'el shell',
    title: 'Escribes una palabra y pasa todo esto',
    lede: 'El shell hace fork, cambia su programa por el tuyo con exec y espera. Es el programa más pequeño que te entrega el control de todo lo que hay debajo.',
    hint: 'escribe ls y pulsa Enter',
    chips: ['bash', 'procesos'],
    figure: {
      kind: 'flow',
      travel: ['sh', 'fork', 'exec', 'sys', 'out'],
      travelLabel: 'ls',
      nodes: [
        { id: 'sh', label: 'sh', sub: 'lee tu línea', x: 40, y: 250, w: 150, tone: 'green' },
        { id: 'fork', label: 'fork()', sub: 'un hijo idéntico', x: 230, y: 250, w: 160, tone: 'blue' },
        { id: 'exec', label: 'execve()', sub: 'ahora es /bin/ls', x: 430, y: 250, w: 180, tone: 'mauve' },
        { id: 'sys', label: 'openat + getdents', sub: 'pregunta al kernel', x: 650, y: 250, w: 220, tone: 'peach' },
        { id: 'out', label: 'stdout', sub: 'lo que ves', x: 830, y: 430, w: 150, tone: 'ink' },
        { id: 'wait', label: 'wait()', sub: 'el padre espera', x: 230, y: 430, w: 160, tone: 'muted' },
      ],
      edges: [
        { from: 'sh', to: 'fork' },
        { from: 'fork', to: 'exec' },
        { from: 'exec', to: 'sys' },
        { from: 'sys', to: 'out' },
        { from: 'sh', to: 'wait', dashed: true },
      ],
    },
  },
  {
    id: 'compilador',
    layer: 'USERSPACE',
    kicker: 'el compilador',
    title: '¿Y quién escribió el programa que ejecuta tu programa?',
    lede: 'El texto que escribes no significa nada para la CPU. Un compilador lo entiende, lo reescribe y lo traduce a las instrucciones exactas que viste girar en el ciclo.',
    chips: ['teoria-lenguajes', 'rust'],
    figure: {
      kind: 'morph',
      stages: [
        {
          label: 'fuente',
          tone: 'blue',
          lines: ['fn main() {', '>   let mut m = Stack::new();', '>   m.push(Hardware);', '}'],
        },
        {
          label: 'árbol sintáctico',
          tone: 'mauve',
          lines: ['fn main', '├─ let m', '│  └─ call Stack::new', '└─ call m.push', '   └─ Hardware'],
        },
        {
          label: 'ensamblador',
          tone: 'peach',
          lines: ['push rbp', 'mov  rbp, rsp', '>call stack_new', 'lea  rdi, [rbp-24]', '>call stack_push'],
        },
        {
          label: 'objeto',
          tone: 'green',
          lines: ['55 48 89 e5 48', '83 ec 18 e8 00', '00 00 00 48 8d', '7d e8 e8 00 00'],
        },
      ],
    },
  },
  {
    id: 'linker',
    layer: 'USERSPACE',
    kicker: 'el enlazado',
    title: 'Tu binario está lleno de agujeros con nombre',
    lede: 'printf, malloc: símbolos que tu código promete usar y no define. El enlazador los rellena, y al arrancar ld.so termina el trabajo con las bibliotecas del sistema.',
    chips: ['build', 'c23'],
    figure: {
      kind: 'flow',
      travel: ['obj', 'ld', 'elf', 'ldso'],
      travelLabel: 'printf',
      nodes: [
        { id: 'obj', label: 'main.o', sub: 'printf: sin resolver', x: 50, y: 150, w: 200, tone: 'blue' },
        { id: 'libc', label: 'libc.a / libc.so', sub: 'aquí sí está definido', x: 50, y: 340, w: 200, tone: 'teal' },
        { id: 'ld', label: 'ld', sub: 'casa símbolo con dirección', x: 330, y: 245, w: 210, tone: 'mauve' },
        { id: 'elf', label: 'ejecutable ELF', sub: 'secciones y cabeceras', x: 600, y: 150, w: 210, tone: 'green' },
        { id: 'ldso', label: 'ld.so', sub: 'resuelve al arrancar', x: 600, y: 340, w: 210, tone: 'peach' },
      ],
      edges: [
        { from: 'obj', to: 'ld' },
        { from: 'libc', to: 'ld', dashed: true },
        { from: 'ld', to: 'elf' },
        { from: 'elf', to: 'ldso', label: 'dinámico', dashed: true },
      ],
    },
  },
];

const RED: Beat[] = [
  {
    id: 'sockets',
    layer: 'RED',
    pushes: true,
    kicker: 'la red',
    title: 'Dos máquinas que no se conocen de nada',
    lede: 'Un socket es un fichero que sale de tu casa. Debajo, TCP parte el mensaje, lo numera y lo reensambla al otro lado aunque el camino cambie a mitad de viaje.',
    chips: ['tcp-ip'],
    figure: {
      kind: 'flow',
      travel: ['socket', 'ip', 'router', 'dns', 'server'],
      travelLabel: 'SYN',
      nodes: [
        { id: 'socket', label: 'socket', sub: 'un fd más', x: 40, y: 250, w: 150, tone: 'green' },
        { id: 'ip', label: 'TCP/IP', sub: 'trocea y numera', x: 230, y: 250, w: 170, tone: 'blue' },
        { id: 'router', label: 'router', sub: 'salta lo que haga falta', x: 440, y: 250, w: 180, tone: 'muted' },
        { id: 'dns', label: 'DNS', sub: 'wandres.dev → IP', x: 440, y: 90, w: 180, tone: 'teal' },
        { id: 'server', label: 'el otro extremo', sub: 'reensambla en orden', x: 680, y: 250, w: 220, tone: 'mauve' },
      ],
      edges: [
        { from: 'socket', to: 'ip' },
        { from: 'ip', to: 'router' },
        { from: 'ip', to: 'dns', label: 'antes de nada', dashed: true },
        { from: 'router', to: 'server', label: 'SYN · SYN/ACK · ACK' },
      ],
    },
  },
  {
    id: 'http',
    layer: 'RED',
    kicker: 'la petición',
    title: 'Un texto con formato, dentro de un candado',
    lede: 'HTTP es sorprendentemente simple: un verbo, una ruta, unas cabeceras. TLS lo envuelve para que nadie del camino pueda leerlo ni cambiarlo sin que se note.',
    chips: ['http-web', 'seguridad-sistemas'],
    figure: {
      kind: 'flow',
      travel: ['req', 'tls', 'srv', 'res'],
      travelLabel: 'GET /',
      bands: [{ label: 'TLS · nadie del camino lo lee', y: 150, h: 260, tone: 'green' }],
      nodes: [
        { id: 'req', label: 'GET / HTTP/2', sub: 'host, accept, cookie', x: 70, y: 210, w: 230, tone: 'blue' },
        { id: 'tls', label: 'handshake', sub: 'claves y certificado', x: 350, y: 210, w: 200, tone: 'green' },
        { id: 'srv', label: 'el servidor', sub: 'busca la ruta', x: 600, y: 210, w: 190, tone: 'mauve' },
        { id: 'res', label: '200 · text/html', sub: 'los bytes de la página', x: 600, y: 400, w: 230, tone: 'peach' },
      ],
      edges: [
        { from: 'req', to: 'tls' },
        { from: 'tls', to: 'srv' },
        { from: 'srv', to: 'res' },
      ],
    },
  },
];

const APP: Beat[] = [
  {
    id: 'render',
    layer: 'APP',
    pushes: true,
    kicker: 'el render',
    title: 'De bytes a píxeles',
    lede: 'El navegador recibe texto, construye un árbol, calcula dónde va cada caja y pinta. Es un compilador y un sistema de ventanas dentro de una pestaña.',
    chips: ['css', 'rendimiento'],
    figure: {
      kind: 'flow',
      travel: ['bytes', 'dom', 'layout', 'paint', 'pantalla'],
      travelLabel: '<html>',
      nodes: [
        { id: 'bytes', label: 'bytes', sub: 'lo que llegó por el cable', x: 30, y: 250, w: 160, tone: 'peach' },
        { id: 'dom', label: 'DOM + CSSOM', sub: 'dos árboles', x: 220, y: 250, w: 180, tone: 'blue' },
        { id: 'layout', label: 'layout', sub: 'dónde va cada caja', x: 440, y: 250, w: 170, tone: 'mauve' },
        { id: 'paint', label: 'paint + composite', sub: 'capas a la GPU', x: 650, y: 250, w: 200, tone: 'teal' },
        { id: 'pantalla', label: 'píxeles', sub: 'lo que ven tus ojos', x: 880, y: 250, w: 100, tone: 'green' },
      ],
      edges: [
        { from: 'bytes', to: 'dom', label: 'parse' },
        { from: 'dom', to: 'layout' },
        { from: 'layout', to: 'paint' },
        { from: 'paint', to: 'pantalla' },
      ],
    },
  },
  {
    id: 'revelacion',
    layer: 'APP',
    kicker: 'la revelación',
    title: 'Y lo que pintó es esto',
    lede: 'Ese navegador es el tuyo y esa página es esta. Acabas de recorrer, de abajo arriba, todo lo que tuvo que ocurrir para que puedas leer esta frase.',
    figure: { kind: 'reveal' },
  },
  {
    id: 'mapa',
    layer: 'APP',
    kicker: 'el territorio',
    title: 'Todo lo que hay debajo, ordenado',
    lede: 'Cada capa que acabas de cruzar tiene su temario. Esto es el mapa completo: en verde, lo que ya has estudiado.',
    hint: 'toca un nodo para entrar',
    figure: { kind: 'graph' },
  },
];

export const BEATS: Beat[] = [...HARDWARE, ...FIRMWARE, ...KERNEL, ...SYSCALL, ...USERSPACE, ...RED, ...APP];

/** The opening beats that ride the 3D board, in order. */
export const BOARD_BEATS = BEATS.filter((b) => b.figure.kind === 'board');
