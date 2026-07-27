// Hub de estudio: cada "track" es un tema con sus propios niveles y lecciones.
export interface Nivel {
  id: number;
  nombre: string;
  subtitulo: string;
  color: string; // variable CSS
  colorHex: string;
  icono: string;
  descripcion: string;
  tags: string[];
}

export interface Track {
  id: string; // 'neovim', 'swift'
  nombre: string;
  subtitulo: string;
  descripcion: string;
  logo: string; // letra o glifo del logo
  colorHex: string; // acento principal
  gradFrom: string;
  gradTo: string;
  estado: 'disponible' | 'proximamente';
  categoria?: string; // id de categoría padre (p. ej. 'systems')
  ref: { cheatsheet?: string; config?: string; recursos?: string };
  niveles: Nivel[];
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  colorHex: string;
  gradFrom: string;
  gradTo: string;
}

// Paletas y "tiers" para construir tracks profundos (muchos niveles).
const PAL = ['var(--green)', 'var(--blue)', 'var(--mauve)', 'var(--sky)', 'var(--peach)', 'var(--teal)', 'var(--yellow)', 'var(--pink)', 'var(--lavender)', 'var(--sapphire)', 'var(--maroon)'];
const PALHEX = ['#a6e3a1', '#89b4fa', '#cba6f7', '#89dceb', '#fab387', '#94e2d5', '#f9e2af', '#f5c2e7', '#b4befe', '#74c7ec', '#eba0ac'];

function buildNiveles(tiers: string[], data: { s: string; d: string; t: string[] }[]): Nivel[] {
  return data.map((x, i) => ({
    id: i,
    nombre: tiers[i] ?? `Nivel ${i}`,
    subtitulo: x.s,
    color: PAL[i % PAL.length],
    colorHex: PALHEX[i % PALHEX.length],
    icono: i === 0 ? '🗺️' : i === data.length - 1 ? '🔱' : String(i),
    descripcion: x.d,
    tags: x.t,
  }));
}

const C23_TIERS = ['Ontología', 'Novato', 'Aprendiz', 'Iniciado', 'Practicante', 'Competente', 'Hábil', 'Diestro', 'Ninja', 'Adepto', 'Experto', 'Veterano', 'Especialista', 'Ingeniero', 'Arquitecto', 'Táctico', 'Modular', 'Constructor', 'Herrero', 'Bibliotecario', 'Enlazador', 'Maestro', 'Sabio', 'Mago', 'Guardián', 'Cazador', 'Centinela', 'Sincronizador', 'Optimizador', 'Semidiós', 'Dios'];

const c23Niveles = buildNiveles(C23_TIERS, [
  { s: 'El mapa de C y la programación de sistemas', d: 'La ontología completa: qué es C, dónde vive, cómo se relaciona todo, y un mapa mental de todo el territorio que vas a conquistar.', t: ['Mapa mental', 'Ontología', 'Panorama'] },
  { s: 'Por qué C hoy', d: 'Historia, filosofía y el lugar de C23 frente a versiones anteriores. La mentalidad del programador de sistemas.', t: ['Historia', 'Filosofía', 'C23'] },
  { s: 'Setup y toolchain', d: 'gcc y clang, compilar con -std=c23, tu primer programa y el entorno de desarrollo moderno.', t: ['gcc/clang', '-std=c23', 'Hello'] },
  { s: 'El proceso de compilación', d: 'Las cuatro fases: preprocesado, compilación, ensamblado y linking. Qué produce exactamente cada una.', t: ['Preprocesador', 'Ensamblado', 'Linking'] },
  { s: 'Tipos y novedades de C23', d: 'Tipos fundamentales y lo nuevo: auto, constexpr, nullptr, typeof, _BitInt y enums con tipo fijo.', t: ['auto', 'constexpr', '_BitInt'] },
  { s: 'Operadores y expresiones', d: 'Precedencia, promociones enteras, conversiones implícitas y sus trampas clásicas.', t: ['Precedencia', 'Promociones', 'Conversiones'] },
  { s: 'Control de flujo', d: 'if, switch, bucles y las mejoras de C23. Flujo idiomático, claro y sin sorpresas.', t: ['if/switch', 'Bucles', 'Flujo'] },
  { s: 'Funciones a fondo', d: 'Parámetros, retorno, scope, storage classes e inline. Cómo se organiza y se llama el código.', t: ['Scope', 'storage class', 'inline'] },
  { s: 'Punteros I: fundamentos', d: 'El concepto que define a C: direcciones, dereferencia, aritmética de punteros y nullptr.', t: ['Direcciones', 'Aritmética', 'nullptr'] },
  { s: 'Arrays y strings', d: 'Decaimiento a puntero, arrays de longitud variable y el manejo (peligroso) de cadenas.', t: ['Decay', 'VLA', 'Cadenas'] },
  { s: 'Punteros II: avanzado', d: 'Punteros a función, dobles punteros, const correctness y patrones profesionales.', t: ['A función', 'Dobles', 'const'] },
  { s: 'Structs y unions', d: 'Layout en memoria, alineación, padding, bitfields y flexible array members.', t: ['Alineación', 'Padding', 'Bitfields'] },
  { s: 'Enums y typedef', d: 'Enumeraciones con tipo subyacente fijo (C23) y el arte de typedef para modelar.', t: ['enum C23', 'typedef', 'Modelado'] },
  { s: 'Memoria dinámica', d: 'malloc, calloc, realloc y free. El heap, los patrones correctos y los errores clásicos.', t: ['malloc/free', 'Heap', 'Fugas'] },
  { s: 'Gestión de memoria avanzada', d: 'Arenas, pools, ownership manual y estrategias de asignación que escalan sin fugas.', t: ['Arenas', 'Pools', 'Ownership'] },
  { s: 'El preprocesador a fondo', d: 'Macros, #embed, X-macros y _Generic: la metaprogramación que es posible en C.', t: ['#embed', 'X-macros', '_Generic'] },
  { s: 'Modularidad y linkage', d: 'Unidades de traducción, headers, extern, y linkage interno frente a externo.', t: ['Headers', 'extern', 'Linkage'] },
  { s: 'Build con Meson', d: 'El sistema de build moderno: targets, dependencias, opciones y sanitizers integrados.', t: ['Meson', 'Targets', 'Opciones'] },
  { s: 'Make y el tooling clásico', d: 'Makefiles, autotools y cuándo elegir cada herramienta de construcción.', t: ['Make', 'Autotools', 'Build'] },
  { s: 'Bibliotecas estáticas y dinámicas', d: 'Crear y usar .a y .so, y las implicaciones profundas de cada tipo de enlace.', t: ['.a / .so', 'Estático', 'Dinámico'] },
  { s: 'El linker y ELF', d: 'Resolución de símbolos, visibilidad, versioning, LTO y el formato ELF por dentro.', t: ['Símbolos', 'ELF', 'LTO'] },
  { s: 'ABI y calling conventions', d: 'La interfaz binaria: System V, convenciones de llamada y estabilidad de ABI.', t: ['System V', 'Calling conv', 'ABI'] },
  { s: 'libc: glibc vs musl', d: 'Qué es una libc, syscalls, POSIX, y las diferencias reales entre glibc y musl.', t: ['glibc', 'musl', 'syscalls'] },
  { s: 'Freestanding y no-libc', d: '-ffreestanding, -nostdlib, bare metal y escribir tu propio runtime mínimo.', t: ['freestanding', '-nostdlib', 'bare metal'] },
  { s: 'Sanitizers', d: 'ASan, UBSan, MSan y TSan: cazar bugs de memoria y comportamiento en ejecución.', t: ['ASan', 'UBSan', 'TSan'] },
  { s: 'Análisis estático y fuzzing', d: 'clang-tidy, cppcheck, Valgrind y libFuzzer: encontrar bugs antes de que ocurran.', t: ['clang-tidy', 'Valgrind', 'Fuzzing'] },
  { s: 'Seguridad y hardening', d: 'Mitigaciones del compilador, stack protector, secure coding y superficie de ataque.', t: ['Hardening', 'Mitigaciones', 'Secure C'] },
  { s: 'Concurrencia', d: 'Hilos C11/C23, atomics, el modelo de memoria y la sincronización correcta.', t: ['threads', 'atomics', 'Modelo mem'] },
  { s: 'Bajo nivel y rendimiento', d: 'Inline asm, SIMD/intrinsics, jerarquía de caché, perf y optimización guiada por datos.', t: ['asm', 'SIMD', 'perf'] },
  { s: 'Undefined Behavior', d: 'El estándar como fuente de verdad, el UB a fondo y cómo lo explota el optimizador.', t: ['UB', 'Estándar', 'Optimización'] },
  { s: 'PhD: construye lo imposible', d: 'Tu propia libc mínima, un allocator desde cero y una mirada a los internals del compilador.', t: ['libc propia', 'allocator', 'internals'] },
]);

function buildTopic(data: { n: string; s: string; d: string; t: string[] }[]): Nivel[] {
  return data.map((x, i) => ({
    id: i,
    nombre: x.n,
    subtitulo: x.s,
    color: PAL[i % PAL.length],
    colorHex: PALHEX[i % PALHEX.length],
    icono: i === 0 ? '🗺️' : i === data.length - 1 ? '🔱' : String(i),
    descripcion: x.d,
    tags: x.t,
  }));
}

const kernelNiveles = buildTopic([
  // — Fundamentos (0-13) —
  { n: 'Ontología', s: 'El mapa del kernel', d: 'La visión aérea del kernel: subsistemas, cómo se relacionan, y el mapa mental de todo lo que vas a dominar.', t: ['Mapa mental', 'Subsistemas'] },
  { n: 'Qué es un kernel', s: 'Anillos, monolítico vs micro', d: 'El rol del kernel, espacio usuario vs kernel, la cadena de arranque y por qué Linux domina.', t: ['Anillos', 'Arranque', 'Linux'] },
  { n: 'El C del kernel', s: 'Freestanding, sin libc', d: 'GNU C, freestanding, sin libc, y el arsenal de macros (container_of) que define el kernel.', t: ['GNU C', 'container_of', 'freestanding'] },
  { n: 'El árbol de fuentes', s: 'Estructura y git', d: 'Navegar millones de líneas: estructura de directorios y usar git para entender el porqué.', t: ['Estructura', 'git blame', 'Navegación'] },
  { n: 'Configurar (Kconfig)', s: 'menuconfig, y/m/n', d: 'El sistema de configuración, escribir tus propias entradas Kconfig, y depends on vs select.', t: ['Kconfig', 'menuconfig', 'y/m/n'] },
  { n: 'Compilar (Kbuild)', s: 'Imagen, módulos, obj-m', d: 'El sistema de build del kernel y el Makefile de tu módulo out-of-tree.', t: ['Kbuild', 'obj-m', 'make'] },
  { n: 'Laboratorio (QEMU)', s: 'VM segura y gdb', d: 'Montar un entorno seguro con QEMU y depurar el kernel en vivo con gdb.', t: ['QEMU', 'gdb', 'Seguro'] },
  { n: 'Tu primer módulo', s: 'LKM y ciclo de vida', d: 'module_init/exit, printk, y las herramientas del ciclo de vida de un módulo.', t: ['LKM', 'printk', 'insmod'] },
  { n: 'Parámetros y /sys', s: 'module_param, sysfs, debugfs', d: 'Exponer y controlar tu módulo como archivos: procfs, sysfs y debugfs.', t: ['module_param', 'sysfs', 'debugfs'] },
  { n: 'Estilo y calidad', s: 'coding style, checkpatch', d: 'El estilo estricto del kernel y las herramientas (checkpatch, sparse) que lo verifican.', t: ['coding style', 'checkpatch', 'sparse'] },
  { n: 'Estructuras de datos', s: 'list_head, rbtree, xarray', d: 'Las listas intrusivas, árboles rojo-negro, hashes y xarray que el kernel usa por todas partes.', t: ['list_head', 'rbtree', 'xarray'] },
  { n: 'Errores del kernel', s: 'ERR_PTR, goto, -errno', d: 'ERR_PTR, el patrón goto de limpieza en cascada, y elegir bien los códigos de error.', t: ['ERR_PTR', 'goto', '-errno'] },
  { n: 'La frontera con el usuario', s: 'copy_*_user, capabilities', d: 'copy_to/from_user, por qué nunca confiar en el usuario, y el sistema de capabilities.', t: ['copy_to_user', 'capabilities', 'Seguridad'] },
  { n: 'Char devices', s: 'file_operations, read/write', d: 'Registrar un char device y darle vida con open, read, write e ioctl.', t: ['file_operations', '/dev', 'ioctl'] },
  // — Concurrencia (14-19) —
  { n: 'Concurrencia y atomics', s: 'SMP, preempción, atomic_t', d: 'Por qué el kernel es concurrente por defecto, y las operaciones atómicas.', t: ['SMP', 'atomic_t', 'preempción'] },
  { n: 'Spinlocks', s: 'spin_lock, irqsave, reglas', d: 'La sincronización que no duerme: spinlocks, irqsave, y las reglas de oro.', t: ['spinlock', 'irqsave', 'deadlock'] },
  { n: 'Locks que duermen', s: 'mutex, rwsem, completion', d: 'Mutex, semáforos, rwsem y completions: sincronización en contexto que puede dormir.', t: ['mutex', 'rwsem', 'completion'] },
  { n: 'RCU', s: 'Read-Copy-Update', d: 'Lecturas sin bloqueo que escalan a miles de núcleos: grace periods, flavors y listas RCU.', t: ['RCU', 'grace period', 'lock-free'] },
  { n: 'Memoria compartida y barreras', s: 'per-CPU, seqlock, memory model', d: 'per-CPU, seqlocks, el modelo de memoria del kernel y las barreras (smp_mb, acquire/release).', t: ['per-CPU', 'seqlock', 'barreras'] },
  { n: 'lockdep y deadlocks', s: 'depurar el locking', d: 'Cómo el kernel detecta deadlocks automáticamente y cómo depurar problemas de sincronización.', t: ['lockdep', 'deadlock', 'debug'] },
  // — Memoria (20-27) —
  { n: 'El page allocator', s: 'buddy, órdenes, GFP', d: 'El asignador de páginas (buddy system), las órdenes de páginas y los flags GFP.', t: ['buddy', 'páginas', 'GFP'] },
  { n: 'slab y slub', s: 'kmalloc, caches de objetos', d: 'kmalloc/kfree por dentro: el slab allocator, slub, y crear tus propios caches (kmem_cache).', t: ['slab', 'slub', 'kmem_cache'] },
  { n: 'vmalloc y direcciones del kernel', s: 'el espacio virtual del kernel', d: 'vmalloc vs kmalloc, y el mapa del espacio de direcciones virtual del kernel.', t: ['vmalloc', 'address space', 'contiguo'] },
  { n: 'mmap y memoria de procesos', s: 'VMA, page faults', d: 'Cómo el kernel gestiona la memoria virtual de los procesos: VMA, page faults y demand paging.', t: ['mmap', 'VMA', 'page fault'] },
  { n: 'El page cache', s: 'address_space, E/S', d: 'Cómo el kernel cachea archivos en memoria y realiza la E/S a través del page cache.', t: ['page cache', 'address_space', 'writeback'] },
  { n: 'Reclaim y presión de memoria', s: 'LRU, kswapd, OOM', d: 'Cómo el kernel recupera memoria bajo presión: LRU, kswapd, swap y el OOM killer.', t: ['reclaim', 'kswapd', 'OOM'] },
  { n: 'NUMA y per-CPU', s: 'localidad y memoria por núcleo', d: 'Memoria no uniforme (NUMA), localidad, y estructuras de datos por CPU.', t: ['NUMA', 'per-CPU', 'localidad'] },
  { n: 'DMA e IOMMU', s: 'transferencias a dispositivos', d: 'DMA coherente y streaming, direcciones de bus, y el IOMMU que protege la memoria.', t: ['DMA', 'IOMMU', 'coherencia'] },
  // — Dispositivos y buses (28-34) —
  { n: 'El device model', s: 'kobject, bus/class/driver', d: 'El modelo de dispositivos unificado: kobject, sysfs, y la tríada bus/class/driver.', t: ['device model', 'kobject', 'sysfs'] },
  { n: 'Platform y device tree', s: 'platform_driver, DT, probe', d: 'Dispositivos sin bus de descubrimiento: platform drivers, device tree y el ciclo probe/remove.', t: ['platform', 'device tree', 'probe'] },
  { n: 'PCI', s: 'config space, BAR, MSI', d: 'El bus PCI/PCIe a fondo: espacio de configuración, BARs, e interrupciones MSI/MSI-X.', t: ['PCI', 'BAR', 'MSI'] },
  { n: 'USB', s: 'URB, endpoints, drivers', d: 'La pila USB: endpoints, URBs, y escribir un driver USB.', t: ['USB', 'URB', 'endpoints'] },
  { n: 'I2C, SPI y regmap', s: 'buses lentos, regmap', d: 'Los buses de dispositivos embebidos (I2C, SPI) y la abstracción regmap para registros.', t: ['I2C', 'SPI', 'regmap'] },
  { n: 'GPIO e IIO', s: 'pines, sensores, IRQ', d: 'Control de pines (GPIO), el subsistema de sensores (IIO), y mapear interrupciones de dispositivo.', t: ['GPIO', 'IIO', 'IRQ'] },
  { n: 'Interrupciones a fondo', s: 'threaded IRQ, softirq, workqueue', d: 'Manejar interrupciones, el trabajo diferido (softirq, tasklet, workqueue) y threaded IRQ.', t: ['IRQ', 'softirq', 'workqueue'] },
  // — Block, VFS e I/O (35-42) —
  { n: 'El block layer', s: 'bio, request, blk-mq', d: 'La capa de bloques: bio, request queues, y la arquitectura multi-cola blk-mq.', t: ['bio', 'blk-mq', 'request'] },
  { n: 'I/O schedulers y block drivers', s: 'mq-deadline, un block driver', d: 'Los planificadores de E/S (mq-deadline, BFQ, Kyber) y escribir un driver de bloques.', t: ['I/O sched', 'BFQ', 'block driver'] },
  { n: 'VFS a fondo', s: 'superblock, inode, dentry, file', d: 'El Virtual File System por dentro: sus cuatro objetos y cómo abstrae cualquier sistema de archivos.', t: ['VFS', 'inode', 'dentry'] },
  { n: 'Escribir un filesystem', s: 'libfs, un FS en memoria', d: 'Registrar un sistema de archivos y construir uno mínimo en memoria con libfs.', t: ['filesystem', 'libfs', 'mount'] },
  { n: 'E/S multiplexada', s: 'select, poll, epoll', d: 'La E/S basada en readiness: select, poll, y epoll a fondo (el motor de la red de alto rendimiento).', t: ['epoll', 'poll', 'readiness'] },
  { n: 'io_uring', s: 'rings SQ/CQ', d: 'La interfaz de E/S asíncrona por anillos: submission/completion queues y el modelo de completado.', t: ['io_uring', 'SQ/CQ', 'async'] },
  { n: 'io_uring avanzado', s: 'buffers registrados, liburing', d: 'Buffers y descriptores registrados, modos de sondeo, multishot y liburing.', t: ['io_uring', 'registered', 'liburing'] },
  { n: 'Zero-copy y mmap de drivers', s: 'DMA a userspace', d: 'Exponer memoria de dispositivo a userspace con mmap y técnicas de copia cero.', t: ['mmap', 'zero-copy', 'DMA'] },
  // — Red (43-44) —
  { n: 'La pila de red', s: 'sk_buff, net_device', d: 'El corazón del networking: sk_buff, net_device, y el viaje de un paquete por el kernel.', t: ['sk_buff', 'net_device', 'paquetes'] },
  { n: 'NAPI, sockets y XDP', s: 'recepción, protocolos, fast path', d: 'La recepción eficiente (NAPI), la API de sockets por dentro, y el fast path con XDP/eBPF.', t: ['NAPI', 'sockets', 'XDP'] },
  // — Tiempo y scheduler (45-47) —
  { n: 'Tiempo', s: 'jiffies, hrtimers, NO_HZ', d: 'Cómo el kernel mide y programa el tiempo: jiffies, hrtimers, clocksource y el modo tickless.', t: ['jiffies', 'hrtimer', 'NO_HZ'] },
  { n: 'El scheduler (EEVDF)', s: 'task_struct, context switch', d: 'El planificador moderno EEVDF, el task_struct, y la mecánica del cambio de contexto.', t: ['EEVDF', 'task_struct', 'context switch'] },
  { n: 'SMP, RT y cgroups', s: 'balanceo, tiempo real, recursos', d: 'Balanceo de carga entre núcleos, scheduling de tiempo real y deadline, y control de recursos con cgroups.', t: ['load balance', 'RT', 'cgroups'] },
  // — Observabilidad y depuración (48-51) —
  { n: 'ftrace y tracepoints', s: 'seguir la ejecución', d: 'El function tracer, los tracepoints estáticos, y la infraestructura de trazado del kernel.', t: ['ftrace', 'tracepoints', 'trace'] },
  { n: 'kprobes y perf', s: 'sondas dinámicas, perfilado', d: 'Instrumentar cualquier función en caliente con kprobes, y perfilar el kernel con perf.', t: ['kprobes', 'perf', 'profiling'] },
  { n: 'eBPF', s: 'programas en el kernel', d: 'Ejecutar programas seguros dentro del kernel: el verifier, los mapas, y sus mil usos.', t: ['eBPF', 'verifier', 'maps'] },
  { n: 'Sanitizers y depuración', s: 'KASAN, KCSAN, kgdb', d: 'Los sanitizers del kernel (KASAN, KCSAN, KMSAN), kmemleak, y depurar oops y panics.', t: ['KASAN', 'KCSAN', 'kgdb'] },
  // — Seguridad y virtualización (52-53) —
  { n: 'Aislamiento y seguridad', s: 'namespaces, cgroups, LSM', d: 'La base de los contenedores (namespaces, cgroups) y los módulos de seguridad (seccomp, LSM/SELinux).', t: ['namespaces', 'seccomp', 'LSM'] },
  { n: 'Virtualización', s: 'KVM, virtio', d: 'Cómo el kernel es un hipervisor: KVM, y los drivers paravirtualizados virtio.', t: ['KVM', 'virtio', 'hypervisor'] },
  // — Rust y upstream (54-57) —
  { n: 'Rust for Linux', s: 'el modelo, abstracciones', d: 'Por qué Rust entró en el kernel, cómo conviven Rust y C, y las abstracciones seguras.', t: ['Rust', 'abstracciones', 'seguro'] },
  { n: 'Un driver en Rust', s: 'un driver real y seguro', d: 'Escribir un driver completo en Rust for Linux, aprovechando su seguridad de memoria.', t: ['Rust', 'driver', 'memory-safe'] },
  { n: 'Contribuir upstream', s: 'el proceso de parches', d: 'Preparar y enviar un parche: git format-patch, send-email, las listas y la revisión.', t: ['parches', 'send-email', 'review'] },
  { n: 'PhD: mantener y el futuro', s: 'ser maintainer, el futuro', d: 'El rol de mantenedor, sostener un subsistema, y hacia dónde va el kernel.', t: ['maintainer', 'futuro', 'comunidad'] },
]);

const rustNiveles = buildTopic([
  // — Fundamentos (0-7) —
  { n: 'Ontología', s: 'El mapa de Rust', d: 'La visión aérea: qué hace único a Rust, sus pilares (ownership, traits, seguridad) y el mapa mental del camino.', t: ['Mapa mental', 'Panorama'] },
  { n: 'Por qué Rust', s: 'seguridad sin GC, la mentalidad', d: 'Seguridad de memoria garantizada en compilación sin recolector de basura, y la mentalidad que exige.', t: ['Seguridad', 'Sin GC', 'Mentalidad'] },
  { n: 'Setup y cargo', s: 'rustup, cargo, edición 2024', d: 'Instalar la toolchain, cargo, y la edición 2024 (Polonius, async closures).', t: ['rustup', 'cargo', 'edición 2024'] },
  { n: 'Variables y tipos', s: 'let, mut, tipos escalares', d: 'Inmutabilidad por defecto, shadowing, tipos escalares y la inferencia de Rust.', t: ['let', 'mut', 'tipos'] },
  { n: 'Control de flujo', s: 'if, loop, while, match', d: 'if como expresión, los bucles, y la primera mirada a match.', t: ['if', 'loop', 'match'] },
  { n: 'Structs y métodos', s: 'modelar datos', d: 'Structs, impl, métodos, y la diferencia con las clases de otros lenguajes.', t: ['struct', 'impl', 'métodos'] },
  { n: 'Enums y pattern matching', s: 'el superpoder de Rust', d: 'Enums con datos, match exhaustivo, if let, y modelar estados imposibles de romper.', t: ['enum', 'match', 'if let'] },
  { n: 'Option y Result', s: 'sin null ni excepciones', d: 'Los tipos que eliminan el null y las excepciones: valores que pueden faltar o fallar, explícitos.', t: ['Option', 'Result', 'sin null'] },
  // — Ownership (8-12) —
  { n: 'Ownership', s: 'move semantics', d: 'El corazón de Rust: cada valor tiene un dueño, y mover transfiere la propiedad. Sin copias ni GC.', t: ['ownership', 'move', 'drop'] },
  { n: 'Borrowing', s: 'referencias y reglas', d: 'Prestar en vez de mover: referencias compartidas (&) y mutables (&mut), y la regla del prestador.', t: ['&', '&mut', 'aliasing'] },
  { n: 'Lifetimes', s: 'validez de las referencias', d: 'Cómo Rust demuestra que una referencia nunca sobrevive a lo que apunta. Anotaciones de lifetime.', t: ['lifetimes', "'a", 'validez'] },
  { n: 'Strings y slices', s: 'String vs &str', d: 'El modelo de cadenas de Rust, los slices, y por qué hay dos tipos de string.', t: ['String', '&str', 'slices'] },
  { n: 'Domar el borrow checker', s: 'pensar en ownership', d: 'Los errores clásicos del borrow checker, NLL, Polonius, y cómo reestructurar en vez de pelear.', t: ['borrow checker', 'NLL', 'Polonius'] },
  // — Traits y genéricos (13-18) —
  { n: 'Traits', s: 'comportamiento compartido', d: 'Los traits definen capacidades (como interfaces), con implementaciones por defecto. La abstracción de Rust.', t: ['trait', 'impl', 'default'] },
  { n: 'Genéricos', s: 'código para cualquier tipo', d: 'Funciones y tipos genéricos con bounds de trait, monomorfización y abstracción de coste cero.', t: ['genéricos', 'bounds', 'zero-cost'] },
  { n: 'Trait objects', s: 'dispatch dinámico', d: 'dyn Trait, dispatch estático vs dinámico, y cuándo usar cada uno.', t: ['dyn', 'dispatch', 'vtable'] },
  { n: 'Traits del sistema', s: 'Clone, Copy, Debug, Default', d: 'Los traits derivables que todo tipo usa, PartialEq/Eq/Ord/Hash, y qué significa cada uno.', t: ['Clone', 'Copy', 'derive'] },
  { n: 'Deref, Drop y operadores', s: 'traits que dan superpoderes', d: 'Sobrecargar operadores, Deref coercion, y Drop (el destructor determinista de Rust).', t: ['Deref', 'Drop', 'operadores'] },
  { n: 'Associated types y GATs', s: 'el sistema de tipos avanzado', d: 'Tipos asociados, Generic Associated Types, y cómo expresan relaciones ricas entre tipos.', t: ['associated', 'GATs', 'tipos'] },
  // — Colecciones y funcional (19-22) —
  { n: 'Colecciones', s: 'Vec, HashMap, BTreeMap', d: 'Las colecciones de la librería estándar, cuándo usar cada una y su rendimiento.', t: ['Vec', 'HashMap', 'BTreeMap'] },
  { n: 'Iteradores', s: 'la pereza y su poder', d: 'El trait Iterator, la evaluación perezosa, y map/filter/fold: transformar sin bucles.', t: ['Iterator', 'lazy', 'map/filter'] },
  { n: 'Closures', s: 'Fn, FnMut, FnOnce', d: 'Las funciones anónimas que capturan su entorno, sus tres traits, y move closures.', t: ['closures', 'Fn', 'capture'] },
  { n: 'Iteradores avanzados', s: 'adaptadores y colecciones', d: 'Adaptadores (zip, chain, flat_map), collect, y escribir tu propio iterador.', t: ['collect', 'adaptadores', 'custom'] },
  // — Errores (23-24) —
  { n: 'Manejo de errores', s: 'Result, ?, panic', d: 'El operador ?, propagar errores, y cuándo panic vs Result.', t: ['?', 'Result', 'panic'] },
  { n: 'Errores propios', s: 'thiserror y anyhow', d: 'Diseñar tipos de error, el trait Error, y las crates thiserror (librerías) y anyhow (apps).', t: ['thiserror', 'anyhow', 'Error'] },
  // — Punteros inteligentes (25-28) —
  { n: 'Smart pointers', s: 'Box, Rc, Arc', d: 'Punteros con semántica propia: Box (heap), Rc (contado), Arc (contado y thread-safe).', t: ['Box', 'Rc', 'Arc'] },
  { n: 'Interior mutability', s: 'Cell, RefCell', d: 'Mutar a través de una referencia compartida de forma controlada, y el borrow checking en runtime.', t: ['Cell', 'RefCell', 'runtime'] },
  { n: 'Lifetimes avanzados', s: 'los casos difíciles', d: 'Lifetime bounds, elisión, HRTB, y los patrones que confunden al borrow checker.', t: ['HRTB', 'elisión', 'bounds'] },
  { n: 'Pin y auto-referencias', s: 'estructuras que se apuntan a sí mismas', d: 'Por qué Rust prohíbe mover ciertos valores, Pin, y la base de los futures async.', t: ['Pin', 'self-ref', 'Unpin'] },
  // — Concurrencia (29-31) —
  { n: 'Concurrencia con threads', s: 'fearless concurrency', d: 'Crear hilos, mover datos entre ellos, y por qué Rust hace imposibles las data races.', t: ['thread', 'spawn', 'fearless'] },
  { n: 'Send y Sync', s: 'la seguridad entre hilos', d: 'Los dos traits marcadores que el compilador usa para garantizar concurrencia segura.', t: ['Send', 'Sync', 'marker'] },
  { n: 'Estado compartido', s: 'Arc, Mutex, channels', d: 'Compartir datos entre hilos con Arc<Mutex>, y comunicar con canales (paso de mensajes).', t: ['Mutex', 'channels', 'Arc'] },
  // — Async (32-36) —
  { n: 'async/await', s: 'fundamentos', d: 'La sintaxis async/await, qué es una función async, y por qué Rust no trae runtime.', t: ['async', 'await', 'Future'] },
  { n: 'Futures y poll', s: 'el modelo de Rust', d: 'El trait Future, el modelo poll/wake, y cómo una función async es una máquina de estados.', t: ['Future', 'poll', 'waker'] },
  { n: 'Tokio', s: 'el runtime', d: 'El runtime async de facto: el scheduler work-stealing, el I/O driver, tasks y spawn.', t: ['tokio', 'runtime', 'work-stealing'] },
  { n: 'async avanzado', s: 'streams, select, cancelación', d: 'Streams, select!, join!, la cancelación por drop, y las async closures de la edición 2024.', t: ['streams', 'select', 'cancelación'] },
  { n: 'Depurar async', s: 'tokio-console, tracing', d: 'Observar y depurar código async: tokio-console, tracing, y los deadlocks async.', t: ['tokio-console', 'tracing', 'debug'] },
  // — Unsafe y FFI (37-40) —
  { n: 'Unsafe', s: 'cuándo y por qué', d: 'Qué desbloquea unsafe, por qué existe, y la responsabilidad que implica.', t: ['unsafe', 'invariantes', 'UB'] },
  { n: 'Punteros crudos', s: 'los cinco superpoderes', d: 'Raw pointers, dereferenciarlos, y las cinco cosas que solo unsafe permite.', t: ['*const', '*mut', 'raw'] },
  { n: 'FFI con C', s: 'interoperar', d: 'Llamar C desde Rust y Rust desde C, extern, bindgen, y la ABI.', t: ['FFI', 'extern', 'bindgen'] },
  { n: 'Abstracciones seguras', s: 'envolver unsafe', d: 'El patrón clave: encapsular unsafe tras una API segura cuyas invariantes garantizas tú.', t: ['safe wrapper', 'invariantes', 'API'] },
  // — Sistemas y no_std (41-43) —
  { n: 'no_std', s: 'Rust sin librería estándar', d: 'El atributo #![no_std], el crate core, y programar sin sistema operativo.', t: ['no_std', 'core', 'bare metal'] },
  { n: 'Embebido', s: 'microcontroladores', d: 'Rust en microcontroladores: embedded-hal, PACs, RTIC y Embassy (async embebido).', t: ['embedded-hal', 'Embassy', 'MCU'] },
  { n: 'Allocators y memoria', s: 'a bajo nivel', d: 'GlobalAlloc, allocators a medida, y la gestión de memoria de bajo nivel.', t: ['GlobalAlloc', 'alloc', 'memoria'] },
  // — Metaprogramación (44-46) —
  { n: 'Macros declarativas', s: 'macro_rules!', d: 'Generar código con macro_rules!: patrones, repetición, y la higiene de macros.', t: ['macro_rules', 'patrones', 'higiene'] },
  { n: 'Macros procedurales', s: 'derive y attribute', d: 'Macros que manipulan el AST: derive, attribute y function-like, con syn y quote.', t: ['proc-macro', 'derive', 'syn'] },
  { n: 'Programación a nivel de tipos', s: 'el sistema de tipos como lenguaje', d: 'Typestate, phantom types, y usar el sistema de tipos para prevenir errores en compilación.', t: ['typestate', 'PhantomData', 'tipos'] },
  // — Herramientas y cierre (47-51) —
  { n: 'Cargo a fondo', s: 'workspaces, features, perfiles', d: 'Workspaces, features condicionales, perfiles de build, y el ecosistema de crates.', t: ['workspaces', 'features', 'perfiles'] },
  { n: 'Testing', s: 'unit, integration, doc, property', d: 'Los tests integrados, doc tests, y el testing basado en propiedades (proptest).', t: ['tests', 'doc test', 'proptest'] },
  { n: 'Rendimiento', s: 'zero-cost, SIMD', d: 'Las abstracciones de coste cero, perfilar (samply), SIMD, y optimización guiada por datos.', t: ['zero-cost', 'SIMD', 'perf'] },
  { n: 'Publicar y ecosistema', s: 'crates.io, docs.rs', d: 'Publicar un crate, documentar, semver, y las herramientas del ecosistema.', t: ['crates.io', 'docs.rs', 'semver'] },
  { n: 'PhD: internals y el futuro', s: 'MIR, el compilador, el futuro', d: 'Cómo funciona el compilador de Rust (HIR, MIR, borrow checker), y hacia dónde va el lenguaje.', t: ['MIR', 'compilador', 'futuro'] },
]);

const astroNiveles = buildTopic([
  { n: 'Ontología', s: 'El mapa de Astro', d: 'La visión aérea de Astro 7: islands, content, SSR/SSG, el compilador en Rust, y el mapa del camino.', t: ['Mapa mental', 'Islands'] },
  { n: 'Por qué Astro', s: 'islands y content-first', d: 'La filosofía: HTML por defecto, cero JS salvo donde hace falta (islands), y el enfoque content-first.', t: ['Islands', 'Zero-JS', 'Filosofía'] },
  { n: 'Setup y proyecto', s: 'Astro 7, Vite 8, Rolldown', d: 'Crear un proyecto, la estructura, y el stack de 2026: compilador en Rust, Vite 8 con Rolldown.', t: ['setup', 'Vite 8', 'Rolldown'] },
  { n: 'El componente .astro', s: 'frontmatter y template', d: 'La anatomía de un componente Astro: el script del frontmatter y el template HTML.', t: ['.astro', 'frontmatter'] },
  { n: 'Templating', s: 'expresiones y directivas', d: 'Expresiones JSX-like, map, condicionales, Fragment, y las directivas de template.', t: ['expresiones', 'directivas'] },
  { n: 'Props y slots', s: 'componer componentes', d: 'Pasar datos con props (tipados), slots nombrados, y el patrón de composición.', t: ['props', 'slots'] },
  { n: 'Estilos', s: 'scoped, global, CSS', d: 'Estilos con scope automático, globales, variables CSS, y la integración con Tailwind/CSS.', t: ['scoped', 'CSS', 'Tailwind'] },
  { n: 'Layouts', s: 'plantillas compartidas', d: 'Layouts como componentes envolventes, slots, y el patrón head/body.', t: ['layouts', 'slots'] },
  { n: 'Routing por archivos', s: 'src/pages', d: 'El enrutado basado en archivos, index, y la estructura de páginas.', t: ['routing', 'pages'] },
  { n: 'Rutas dinámicas', s: 'params y getStaticPaths', d: 'Rutas dinámicas ([slug], [...rest]), getStaticPaths, y params.', t: ['[slug]', 'getStaticPaths'] },
  { n: 'Routing avanzado', s: 'redirects, paginación, rewrites', d: 'Redirecciones en config y Astro.redirect, paginación con paginate(), la prop page, rewrites y prioridad de rutas.', t: ['redirects', 'paginate', 'rewrite'] },
  { n: 'Content Collections', s: 'glob loader y schema', d: 'Colecciones de contenido con el content layer: content.config.ts, glob loader, Zod schema, getCollection y render.', t: ['collections', 'glob', 'schema'] },
  { n: 'Content Layer API', s: 'loaders personalizados', d: 'La Content Layer API: loaders integrados y propios, el store, parseData, y caching incremental.', t: ['loaders', 'store', 'API'] },
  { n: 'Markdown a fondo', s: 'remark, rehype, headings', d: 'Markdown como página, render() y getHeadings, plugins remark y rehype, y la config global de markdown.', t: ['Markdown', 'remark', 'rehype'] },
  { n: 'MDX a fondo', s: 'componentes y expresiones', d: 'Qué añade MDX, usar componentes dentro del contenido, expresiones y exportaciones, layouts, y el prop components.', t: ['MDX', 'componentes'] },
  { n: 'Resaltado de código', s: 'Shiki y transformers', d: 'Resaltado nativo con Shiki, temas dual claro/oscuro, el componente Code, transformers, y cliente vs servidor.', t: ['Shiki', 'código'] },
  { n: 'RSS, sitemap y datos', s: 'feeds y datos derivados', d: 'Feed RSS con @astrojs/rss, sitemap, endpoints de datos, import.meta.glob, y robots/canonical/Open Graph.', t: ['RSS', 'sitemap', 'datos'] },
  { n: 'Arquitectura de islas', s: 'client:load, visible, only', d: 'La arquitectura de islas: client:load/idle/visible/media/only, compartir estado y el coste de la hidratación.', t: ['islands', 'client:', 'hydration'] },
  { n: 'Integraciones de framework', s: 'React, Solid, Vue, Svelte', d: 'astro add y los renderers, pasar props y slots, anidar frameworks distintos, y estado compartido con nanostores.', t: ['React', 'Solid', 'islands'] },
  { n: 'Server Islands', s: 'server:defer y fallback', d: 'Server islands: server:defer, el contenido fallback, cómo funcionan por dentro, casos de uso y límites.', t: ['server islands', 'server:defer'] },
  { n: 'SSR, SSG e híbrido', s: 'output y prerender', d: 'Los modos de render de Astro 7, prerender por página, el objeto Astro en SSR, y estrategias de render.', t: ['SSR', 'SSG', 'prerender'] },
  { n: 'Adapters', s: 'Node, Cloudflare, Vercel', d: 'Qué es un adapter, @astrojs/node, adapters de edge y serverless, configurarlos y elegir plataforma.', t: ['adapters', 'deploy', 'edge'] },
  { n: 'Endpoints y API', s: 'rutas de servidor', d: 'Endpoints estáticos y SSR, verbos y APIContext, params dinámicos, streaming y CORS, y patrones reales.', t: ['endpoints', 'API', 'JSON'] },
  { n: 'Middleware', s: 'onRequest y locals', d: 'El middleware: onRequest, context.locals tipado, modificar la respuesta, sequence, y casos reales.', t: ['middleware', 'locals'] },
  { n: 'Actions', s: 'funciones de servidor tipadas', d: 'Astro Actions: defineAction, input con Zod, llamarlas (data/error), formularios progresivos y errores tipados.', t: ['actions', 'type-safe', 'Zod'] },
  { n: 'Sesiones y estado', s: 'Astro.session y cookies', d: 'La Sessions API, drivers de almacenamiento, cookies con Astro.cookies, auth con sesión y seguridad.', t: ['sessions', 'cookies', 'auth'] },
  { n: 'View Transitions', s: 'ClientRouter y transiciones', d: 'El ClientRouter, transition:name/animate, transition:persist, los eventos del ciclo y accesibilidad.', t: ['transitions', 'router', 'SPA'] },
  { n: 'Imágenes', s: 'astro:assets', d: 'El componente Image, Picture y formatos, imágenes remotas y en colecciones, getImage, y rendimiento/CLS.', t: ['assets', 'Image', 'CLS'] },
  { n: 'Fuentes (Fonts API)', s: 'fuentes optimizadas', d: 'La Fonts API: familias y proveedores, el componente Font y el preload, rendimiento tipográfico y autoalojar.', t: ['fonts', 'CLS', 'preload'] },
  { n: 'Variables de entorno', s: 'astro:env', d: 'import.meta.env, el schema tipado de astro:env, leer client/server y getSecret, secretos y buenas prácticas.', t: ['env', 'secrets', 'type-safe'] },
  { n: 'i18n', s: 'internacionalización', d: 'El routing i18n integrado, los helpers de URL por locale, contenido traducido y fallback, y SEO multiidioma.', t: ['i18n', 'locales', 'hreflang'] },
  { n: 'Seguridad', s: 'CSP, XSS, cabeceras', d: 'XSS y set:html, Content Security Policy, cabeceras de seguridad, CSRF y checkOrigin, y buenas prácticas.', t: ['CSP', 'XSS', 'seguridad'] },
  { n: 'SEO', s: 'metadatos, OG, JSON-LD', d: 'Metadatos base y canonical, Open Graph y og:image dinámica, datos estructurados JSON-LD, indexación y Web Vitals.', t: ['SEO', 'Open Graph', 'JSON-LD'] },
  { n: 'Prefetch y navegación', s: 'estrategias de prefetch', d: 'La feature prefetch y sus estrategias, prefetchAll, la API programática, presupuesto LCP/INP y medición.', t: ['prefetch', 'LCP', 'INP'] },
  { n: 'Escribir integraciones', s: 'Integration API', d: 'La Integration API: AstroIntegration, el hook astro:config:setup, otros hooks del ciclo, módulos virtuales y publicar.', t: ['integrations', 'hooks', 'plugins'] },
  { n: 'El compilador en Rust', s: 'el pipeline de Astro 7', d: 'Por qué un compilador propio, el pipeline parse/transform, islas e hidratación en el output, WASM vs binario nativo.', t: ['compilador', 'Rust', 'build'] },
  { n: 'Vite 8 y Rolldown', s: 'el motor por debajo', d: 'El rol de Vite, Rolldown el bundler en Rust, configurar Vite desde astro.config, el grafo de módulos y diagnóstico.', t: ['Vite 8', 'Rolldown', 'bundler'] },
  { n: 'Rendimiento', s: 'Core Web Vitals', d: 'El presupuesto de JS, Core Web Vitals a fondo, analizar el bundle, optimizar assets/CSS/caché y el SSR.', t: ['performance', 'Web Vitals'] },
  { n: 'Testing', s: 'Vitest, Container, Playwright', d: 'Estrategia de testing, Vitest en Astro, la Container API, testear endpoints y actions, y e2e con Playwright.', t: ['Vitest', 'Container', 'Playwright'] },
  { n: 'Deploy', s: 'a producción', d: 'Anatomía del build, deploy estático y SSR/edge, CI/CD con GitHub Actions, y operar en producción.', t: ['deploy', 'CI/CD', 'edge'] },
  { n: 'Arquitectura a escala', s: 'proyectos grandes', d: 'Estructura de un proyecto serio, monorepos con pnpm/Turborepo, contenido a escala, composición y mantenibilidad.', t: ['arquitectura', 'monorepo', 'escala'] },
  { n: 'Nivel Dios: síntesis', s: 'arquitectura y trade-offs', d: 'El modelo mental completo, diseñar el render por página, rendimiento extremo, un caso de estudio integral y el futuro.', t: ['síntesis', 'arquitectura', 'PhD'] },
]);

// ---------------------------------------------------------------------------
// TRACK: SOLIDJS
// ---------------------------------------------------------------------------
const solidNiveles = buildTopic([
  // — Fundamentos (0-9) —
  { n: 'Ontología', s: 'El mapa de Solid', d: 'La visión aérea de SolidJS: reactividad de grano fino, el grafo, componentes que corren una vez, stores, async y SolidStart. El mapa mental completo.', t: ['Mapa mental', 'Reactividad'] },
  { n: 'Por qué Solid', s: 'grano fino vs VDOM', d: 'La idea central: reactividad de grano fino sin virtual DOM ni re-render. Comparación honesta con React y por qué Solid es tan rápido.', t: ['fine-grained', 'no VDOM', 'filosofía'] },
  { n: 'Setup y JSX de Solid', s: 'no es React', d: 'Crear un proyecto, el JSX de Solid (se compila a DOM real), y las diferencias sutiles pero críticas con el JSX de React.', t: ['setup', 'JSX', 'Vite'] },
  { n: 'createSignal', s: 'el átomo reactivo', d: 'El primitivo fundamental: getter/setter, lectura reactiva vs no reactiva, y por qué un signal es una función.', t: ['createSignal', 'getter', 'setter'] },
  { n: 'createEffect', s: 'reacciones a los signals', d: 'Efectos que se re-ejecutan cuando sus dependencias cambian: tracking automático, timing, y el primer render.', t: ['createEffect', 'tracking', 'dependencias'] },
  { n: 'createMemo', s: 'valores derivados', d: 'Memos: derivaciones cacheadas que solo recalculan cuando cambian sus fuentes; cuándo un memo y cuándo una función.', t: ['createMemo', 'derivado', 'cache'] },
  { n: 'El modelo de ejecución', s: 'el componente corre una vez', d: 'La diferencia mental clave: el cuerpo del componente se ejecuta UNA sola vez; la reactividad vive en el JSX y los efectos.', t: ['run once', 'render', 'modelo'] },
  { n: 'Props', s: 'mergeProps, splitProps', d: 'Las props son reactivas: por qué NO destructurarlas, mergeProps para defaults, splitProps para separar, y la reactividad que se pierde.', t: ['props', 'mergeProps', 'splitProps'] },
  { n: 'children()', s: 'resolver hijos', d: 'El helper children(): resolver y memoizar los hijos, evitar re-crearlos, y manipular el árbol de forma segura.', t: ['children', 'slots', 'composición'] },
  { n: 'Eventos y binding', s: 'on:, delegación, refs', d: 'Manejo de eventos (delegados y nativos), binding de atributos y propiedades, classList, style, y el atributo ref.', t: ['eventos', 'classList', 'ref'] },
  // — Reactividad a fondo (10-18) —
  { n: 'El grafo reactivo', s: 'observers y sources', d: 'Cómo funciona por dentro: nodos, observers y sources, propagación push/pull, y por qué no hay diffing.', t: ['grafo', 'observers', 'internals'] },
  { n: 'Ownership y cleanup', s: 'onCleanup, getOwner', d: 'El árbol de ownership: onCleanup, getOwner, runWithOwner; cómo Solid libera recursos automáticamente.', t: ['ownership', 'onCleanup', 'disposal'] },
  { n: 'untrack, batch, on', s: 'controlar el tracking', d: 'Leer sin trackear (untrack), agrupar cambios (batch), y dependencias explícitas con on() y defer.', t: ['untrack', 'batch', 'on()'] },
  { n: 'createRoot y disposal', s: 'raíces reactivas', d: 'createRoot para crear un scope reactivo manual, cuándo hace falta, y el ciclo de vida de disposición.', t: ['createRoot', 'scope', 'dispose'] },
  { n: 'Signals avanzados', s: 'equals y opciones', d: 'Igualdad personalizada (equals: false), signals sin comparación, y patrones para señales que siempre notifican.', t: ['equals', 'options', 'patrones'] },
  { n: 'Control flow: Show y Switch', s: 'condicionales reactivos', d: 'Renderizado condicional eficiente: Show con fallback y keyed, Switch/Match, y por qué no usar ternarios crudos.', t: ['Show', 'Switch', 'Match'] },
  { n: 'Control flow: For e Index', s: 'listas keyed vs por índice', d: 'For (keyed por referencia) vs Index (por posición): cuándo cada uno, el coste de reconciliación y errores típicos.', t: ['For', 'Index', 'listas'] },
  { n: 'Dynamic, Portal, ErrorBoundary', s: 'componentes especiales', d: 'Dynamic para componentes en runtime, Portal para renderizar fuera del árbol, y ErrorBoundary para capturar errores.', t: ['Dynamic', 'Portal', 'ErrorBoundary'] },
  { n: 'Lifecycle y refs', s: 'onMount, ciclo de vida', d: 'onMount y el ciclo de vida real de Solid, refs al DOM, forward refs, y cuándo el DOM está disponible.', t: ['onMount', 'refs', 'ciclo'] },
  // — Stores y estado (19-25) —
  { n: 'createStore', s: 'reactividad anidada', d: 'Stores: objetos reactivos de grano fino y anidados, acceso por proxy, y por qué escalan mejor que muchos signals.', t: ['createStore', 'proxy', 'anidado'] },
  { n: 'setStore y produce', s: 'mutaciones inmutables', d: 'Actualizar stores: paths, funciones, arrays, y produce()/modifyMutable para un estilo mutable seguro (tipo Immer).', t: ['setStore', 'produce', 'paths'] },
  { n: 'reconcile y unwrap', s: 'diff de datos externos', d: 'reconcile() para fusionar datos externos preservando referencias, unwrap() para obtener el objeto crudo, y sus usos.', t: ['reconcile', 'unwrap', 'diff'] },
  { n: 'Estado global', s: 'stores compartidos', d: 'Patrones de estado global sin librerías: un store en un módulo o createRoot, y cómo compartirlo entre componentes.', t: ['global', 'módulo', 'patrón'] },
  { n: 'Context', s: 'createContext, useContext', d: 'La API de contexto de Solid: proveer y consumir estado por el árbol, con reactividad intacta y sin prop drilling.', t: ['createContext', 'useContext', 'provider'] },
  { n: 'createMutable', s: 'el store mutable', d: 'createMutable para un proxy de escritura directa; su potencia, sus peligros, y cuándo (casi nunca) usarlo.', t: ['createMutable', 'proxy', 'cuidado'] },
  { n: 'Integrar librerías', s: 'interoperar con JS', d: 'Envolver librerías no reactivas: from()/observable, integrar con Web APIs, y crear tus propios primitivos reactivos.', t: ['from', 'interop', 'primitivos'] },
  // — Async y datos (26-31) —
  { n: 'createResource', s: 'async como primitivo', d: 'El async first-class de Solid: createResource, estados (loading/error), refetch, y el source reactivo que lo dispara.', t: ['createResource', 'async', 'loading'] },
  { n: 'Suspense', s: 'coordinar la carga', d: 'Suspense y SuspenseList: coordinar múltiples resources, fallbacks, y evitar cascadas de spinners.', t: ['Suspense', 'fallback', 'coordinación'] },
  { n: 'Transitions', s: 'startTransition, useTransition', d: 'Transiciones concurrentes: mantener la UI vieja mientras carga la nueva, useTransition y su estado pending.', t: ['transitions', 'pending', 'concurrente'] },
  { n: 'ErrorBoundary a fondo', s: 'errores en async', d: 'Manejo de errores con async: cómo se propagan a ErrorBoundary, reset, y patrones de reintento robustos.', t: ['errores', 'reset', 'retry'] },
  { n: 'Derivaciones async', s: 'createAsync y el futuro', d: 'El nuevo modelo de datos: createAsync (Solid Router / 2.0), señales async, y hacia dónde va la reactividad async.', t: ['createAsync', 'Solid 2.0', 'datos'] },
  { n: 'Patrones de data fetching', s: 'cache, dedup, prefetch', d: 'Patrones reales: deduplicación, cache, prefetch en navegación, mutaciones optimistas y revalidación.', t: ['cache', 'prefetch', 'optimista'] },
  // — SolidStart / meta-framework (32-38) —
  { n: 'SolidStart', s: 'el meta-framework', d: 'SolidStart sobre Vinxi/Nitro: crear el proyecto, la estructura, y qué añade sobre Solid puro.', t: ['SolidStart', 'Nitro', 'setup'] },
  { n: 'File routing', s: 'rutas y layouts', d: 'El enrutado por archivos de Solid Router: rutas anidadas, layouts, rutas dinámicas y route data.', t: ['routing', 'layouts', 'nested'] },
  { n: 'Modos de render', s: 'SSR, streaming, CSR, SSG', d: 'Los modos de renderizado: SSR síncrono y en streaming, CSR, y prerender/SSG; cuándo cada uno.', t: ['SSR', 'streaming', 'SSG'] },
  { n: 'Server functions', s: '"use server"', d: 'Funciones que solo corren en el servidor con "use server": RPC type-safe, serialización, y la frontera cliente/servidor.', t: ['use server', 'RPC', 'server'] },
  { n: 'Actions y forms', s: 'mutaciones progresivas', d: 'Actions para mutaciones, formularios con progressive enhancement, useSubmission, y estado optimista.', t: ['actions', 'forms', 'submission'] },
  { n: 'Data loading', s: 'query, cache, createAsync', d: 'Cargar datos con query() y cache, preload en el router, createAsync, y revalidación tras una action.', t: ['query', 'preload', 'revalidate'] },
  { n: 'Auth y middleware', s: 'sesiones y protección', d: 'Sesiones y auth en SolidStart, middleware de peticiones, cookies, y proteger rutas y server functions.', t: ['auth', 'sessions', 'middleware'] },
  // — Maestría (39-41) —
  { n: 'El compilador de Solid', s: 'jsx-dom-expressions', d: 'Cómo Solid compila JSX a DOM real y a expresiones reactivas: babel-plugin-jsx-dom-expressions, y por qué compilar gana.', t: ['compilador', 'dom-expressions', 'internals'] },
  { n: 'Rendimiento y Solid 2.0', s: 'lo que viene', d: 'Optimización extrema, el nuevo runtime reactivo (async transparente) de Solid 2.0, y benchmarks frente al ecosistema.', t: ['performance', 'Solid 2.0', 'futuro'] },
  { n: 'Nivel Dios: síntesis', s: 'arquitectura y trade-offs', d: 'El modelo mental completo, arquitectar una app real de principio a fin, comparación con el ecosistema y cuándo Solid NO es la elección.', t: ['síntesis', 'arquitectura', 'PhD'] },
]);

// ---------------------------------------------------------------------------
// TRACK: BUILD & PRODUCCIÓN
// ---------------------------------------------------------------------------
const buildTrackNiveles = buildTopic([
  // — Fundamentos (0-9) —
  { n: 'Ontología', s: 'El mapa del build', d: 'La visión aérea del camino a producción: módulos, package managers, Vite, el bundler, empaquetado, monorepos, caching y deploy. El mapa mental completo.', t: ['Mapa mental', 'Toolchain'] },
  { n: 'Por qué existe el build', s: 'módulos y navegadores', d: 'El problema que resuelven las build tools: módulos, compatibilidad de navegadores, TypeScript/JSX, y una breve historia de webpack a Vite.', t: ['Historia', 'Problema', 'Módulos'] },
  { n: 'Módulos JS', s: 'ESM vs CommonJS', d: 'El sistema de módulos: ESM (import/export), CommonJS (require), dynamic import, y la interoperabilidad entre ambos.', t: ['ESM', 'CommonJS', 'import'] },
  { n: 'Package managers', s: 'npm, yarn, pnpm', d: 'Los gestores de paquetes: npm vs yarn vs pnpm, y por qué pnpm gana con su store de contenido enlazado y su ahorro de disco.', t: ['pnpm', 'npm', 'store'] },
  { n: 'package.json a fondo', s: 'campos y scripts', d: 'La anatomía de package.json: dependencies vs devDependencies, scripts, semver, engines, y los campos que importan.', t: ['package.json', 'semver', 'scripts'] },
  { n: 'Resolución de módulos', s: 'exports e imports', d: 'Cómo Node y los bundlers resuelven un import: el campo exports, conditions, subpath imports, y los mapas de resolución.', t: ['exports', 'conditions', 'resolve'] },
  { n: 'Lockfiles', s: 'reproducibilidad', d: 'Los lockfiles (pnpm-lock.yaml): builds reproducibles, el árbol de dependencias, hoisting, y por qué NO borrarlos.', t: ['lockfile', 'reproducible', 'hoisting'] },
  { n: 'pnpm workspaces', s: 'el monorepo básico', d: 'Workspaces de pnpm: varios paquetes en un repo, el protocolo workspace, --filter para tareas selectivas, y dependencias internas.', t: ['workspaces', 'filter', 'workspace:'] },
  { n: 'pnpm catalogs', s: 'versiones compartidas', d: 'Catalogs: definir versiones de dependencias una sola vez y referenciarlas; catalogMode strict/prefer/manual; coherencia a escala.', t: ['catalogs', 'catalogMode', 'versiones'] },
  { n: 'El registro npm', s: 'publicar paquetes', d: 'El registro: publicar, paquetes scoped, dist-tags, provenance (procedencia firmada), y alternativas como JSR.', t: ['npm publish', 'scoped', 'provenance'] },
  // — Vite y el dev server (10-16) —
  { n: 'Vite', s: 'el dev server moderno', d: 'Qué es Vite: dev server sobre ESM nativo del navegador, arranque instantáneo, y por qué reemplazó a webpack en dev.', t: ['Vite', 'dev server', 'ESM'] },
  { n: 'HMR', s: 'hot module replacement', d: 'Cómo funciona el HMR: el grafo de módulos, aceptar actualizaciones sin recargar, preservar estado, y la API import.meta.hot.', t: ['HMR', 'import.meta.hot', 'grafo'] },
  { n: 'Configurar Vite', s: 'plugins y resolve', d: 'La config de Vite: plugins, resolve.alias, server, define, css, y cómo estructurar una configuración mantenible.', t: ['config', 'plugins', 'alias'] },
  { n: 'optimizeDeps', s: 'pre-bundling', d: 'El pre-bundling de dependencias con esbuild: por qué Vite convierte CJS a ESM y agrupa deps para reducir peticiones en dev.', t: ['optimizeDeps', 'esbuild', 'pre-bundle'] },
  { n: 'Ecosistema de plugins', s: 'Rollup-compatible', d: 'El sistema de plugins de Vite (compatible con Rollup): hooks, transformar código, módulos virtuales, y escribir el tuyo.', t: ['plugins', 'hooks', 'virtual'] },
  { n: 'La Environment API', s: 'multi-entorno y SSR', d: 'La Environment API de Vite: modelar cliente, SSR y edge como entornos separados; el nuevo modelo que unifica dev y build.', t: ['Environment API', 'SSR', 'edge'] },
  { n: 'Dev vs build', s: 'las dos mitades', d: 'Las dos naturalezas de Vite: ESM sin bundle en dev vs un bundle optimizado en build; por qué difieren y sus implicaciones.', t: ['dev', 'build', 'diferencias'] },
  // — El bundler (17-25) —
  { n: 'Qué hace un bundler', s: 'el grafo de módulos', d: 'La anatomía de un bundler: entry points, el grafo de módulos, resolución, transformación y la generación del output.', t: ['bundler', 'grafo', 'entry'] },
  { n: 'Rollup', s: 'el modelo de plugins', d: 'Rollup: el bundler que definió el modelo; output formats (esm, cjs, iife), plugins, y por qué Vite lo usó en build.', t: ['Rollup', 'output', 'plugins'] },
  { n: 'Rolldown', s: 'el bundler en Rust', d: 'Rolldown 1.0 (sobre Oxc): el bundler en Rust que reemplaza a esbuild y Rollup en Vite 8; API compatible con Rollup y builds 10-30x más rápidos.', t: ['Rolldown', 'Rust', 'Oxc'] },
  { n: 'esbuild, SWC y Oxc', s: 'el toolchain en Rust/Go', d: 'Los transformadores rápidos: esbuild (Go, bundler+transform), SWC (Rust, transform), Oxc (Rust, todo el toolchain); qué usa cada capa.', t: ['esbuild', 'SWC', 'Oxc'] },
  { n: 'Tree shaking', s: 'eliminar código muerto', d: 'Tree shaking: análisis estático para quitar lo que no se usa; el papel de ESM, sideEffects en package.json, y sus límites.', t: ['tree shaking', 'sideEffects', 'DCE'] },
  { n: 'Code splitting', s: 'dividir el bundle', d: 'Code splitting: dividir el código en chunks cargados bajo demanda; dynamic import, chunks compartidos, y la estrategia de división.', t: ['code splitting', 'chunks', 'dynamic import'] },
  { n: 'Lazy loading', s: 'cargar bajo demanda', d: 'Lazy loading: diferir código no crítico; por ruta y por componente, prefetch/preload, y el equilibrio con el número de peticiones.', t: ['lazy', 'prefetch', 'route-based'] },
  { n: 'Minificación', s: 'terser, esbuild, oxc', d: 'Minificar el output: terser vs esbuild vs oxc-minify, mangling, compresión, y los source maps para depurar en producción.', t: ['minify', 'source maps', 'terser'] },
  { n: 'Assets', s: 'CSS, imágenes, fuentes', d: 'El pipeline de assets: importar CSS/imágenes/fuentes, hashing para cache-busting, inlining de assets pequeños, y CSS code splitting.', t: ['assets', 'hashing', 'CSS'] },
  // — Empaquetado de librerías (26-30) —
  { n: 'Empaquetar una librería', s: 'ESM, CJS, tipos', d: 'Publicar una librería: qué formatos ofrecer (ESM, CJS, UMD), incluir tipos de TypeScript, y qué NO empaquetar (externals).', t: ['library', 'formats', 'externals'] },
  { n: 'exports para librerías', s: 'dual package', d: 'El campo exports para librerías: dual package (ESM+CJS), conditions (import/require/types), subpaths, y el peligro del dual package hazard.', t: ['exports', 'dual package', 'types'] },
  { n: 'Herramientas de build', s: 'Vite lib, tsup, unbuild', d: 'Construir la librería: Vite en lib mode, tsup (esbuild), unbuild (rollup); generar tipos con dts, y elegir herramienta.', t: ['lib mode', 'tsup', 'dts'] },
  { n: 'Publicar la librería', s: 'versiones y provenance', d: 'Publicar: versionado semántico, dist-tags (latest/next), provenance firmada, empaquetar solo lo necesario (files), y npm vs JSR.', t: ['publish', 'semver', 'JSR'] },
  { n: 'Changesets', s: 'versionado en monorepo', d: 'Changesets: declarar el impacto de cada cambio, versionar múltiples paquetes de forma coordinada, generar changelogs y publicar en CI.', t: ['changesets', 'changelog', 'release'] },
  // — Monorepos y caching (31-37) —
  { n: 'Monorepos', s: 'por qué y cómo', d: 'Monorepos: un repo con muchos paquetes; ventajas (código compartido, cambios atómicos), retos (build, CI), y el panorama de herramientas.', t: ['monorepo', 'estructura', 'herramientas'] },
  { n: 'Turborepo', s: 'task graph y caching', d: 'Turborepo: el grafo de tareas, el pipeline (turbo.json), inputs/outputs, y el caching local que evita re-ejecutar lo que no cambió.', t: ['Turborepo', 'task graph', 'cache'] },
  { n: 'Remote caching', s: 'compartir la caché', d: 'Remote caching: subir artefactos de build a una caché compartida (Vercel o self-hosted) para que otra máquina o CI reutilice el resultado.', t: ['remote cache', 'Vercel', 'self-hosted'] },
  { n: 'Nx', s: 'el build system completo', d: 'Nx: grafo de tareas, plugins y generadores, Nx Cloud con Replay, y distributed task execution (DTE) que reparte tareas entre máquinas.', t: ['Nx', 'Nx Cloud', 'DTE'] },
  { n: 'Elegir herramienta', s: 'Turborepo vs Nx vs Moon', d: 'Comparar los build systems: Turborepo (simple, rápido) vs Nx (completo, plugins) vs Moon; criterios para elegir según tu equipo.', t: ['comparación', 'elección', 'Moon'] },
  { n: 'Cómo funciona la caché', s: 'hashing e invalidación', d: 'La caché por dentro: hashing de inputs (archivos, deps, env), qué invalida un hit, y la seguridad (envenenamiento de caché, el CVE CREEP).', t: ['hashing', 'invalidación', 'seguridad'] },
  { n: 'Module Federation', s: 'microfrontends', d: 'Module Federation: compartir código entre apps en runtime; microfrontends, equipos independientes, remotes/host, y sus trade-offs.', t: ['Module Federation', 'microfrontends', 'runtime'] },
  // — Producción (38-40) —
  { n: 'Optimización de producción', s: 'bundle budgets', d: 'Optimizar el output: analizar el bundle (visualizer), presupuestos de tamaño, dividir vendor, y perseguir Core Web Vitals desde el build.', t: ['bundle analysis', 'budgets', 'Web Vitals'] },
  { n: 'CI/CD para frontend', s: 'pipeline y deploy', d: 'La tubería a producción: instalar con caché, lint/test/build, la caché remota en CI, previews por PR, y desplegar al edge o a un CDN.', t: ['CI/CD', 'deploy', 'edge'] },
  { n: 'Nivel Dios: síntesis', s: 'el toolchain unificado', d: 'La imagen completa: arquitectar el build de un producto a escala, el toolchain unificado en Rust (VoidZero: Vite, Rolldown, Oxc), y hacia dónde va todo.', t: ['síntesis', 'VoidZero', 'futuro'] },
]);

// ---------------------------------------------------------------------------
// TRACK: REACTIVIDAD Y ESTADO
// ---------------------------------------------------------------------------
const estadoNiveles = buildTopic([
  // — Fundamentos (0-8) —
  { n: 'Ontología', s: 'El mapa del estado', d: 'La visión aérea: primitivos de reactividad, máquinas de estado, Flux/Redux, las arquitecturas unidireccionales (Elm, TCA, MVI) y el estado del servidor. El mapa mental completo.', t: ['Mapa mental', 'Estado'] },
  { n: 'Qué es el estado', s: 'la raíz de la complejidad', d: 'Qué es "estado" y por qué es la mayor fuente de complejidad en una app; estado esencial vs accidental, y la meta de domarlo.', t: ['estado', 'complejidad', 'teoría'] },
  { n: 'Taxonomía del estado', s: 'local, global, servidor, URL', d: 'Las clases de estado: local de UI, global de cliente, del servidor (cache), de la URL, y de formularios; cada una pide una herramienta distinta.', t: ['taxonomía', 'servidor', 'URL'] },
  { n: 'Primitivos de reactividad', s: 'observer y pub/sub', d: 'Los cimientos: el patrón observer, pub/sub, y cómo un cambio propaga a quien lo escucha; la base de todo sistema reactivo.', t: ['observer', 'pub/sub', 'reactividad'] },
  { n: 'Signals', s: 'el modelo y TC39', d: 'Signals: getter/setter con tracking automático de dependencias; el modelo, su auge en 2026, y el TC39 Signals proposal.', t: ['signals', 'TC39', 'tracking'] },
  { n: 'Observables', s: 'RxJS y streams', d: 'El modelo push de los observables: streams de eventos en el tiempo, operadores, y RxJS; cuándo un stream y cuándo un signal.', t: ['observables', 'RxJS', 'streams'] },
  { n: 'Derivación', s: 'memos y selectores', d: 'Estado derivado: valores computados a partir de otros (memos, selectores), memoización, y por qué derivar es mejor que duplicar.', t: ['derivar', 'selectors', 'memo'] },
  { n: 'Inmutabilidad', s: 'structural sharing', d: 'Por qué la inmutabilidad domina el estado: comparación por referencia, structural sharing, Immer, y el coste real de copiar.', t: ['inmutable', 'Immer', 'referencia'] },
  { n: 'El problema de sincronizar', s: 'glitches y consistencia', d: 'La dificultad central de la reactividad: glitches, estados intermedios inconsistentes, orden de actualización, y la propagación glitch-free.', t: ['glitches', 'consistencia', 'orden'] },
  // — Máquinas de estado (9-16) —
  { n: 'Máquinas de estado finitas', s: 'estados, eventos, transiciones', d: 'La FSM: un conjunto finito de estados, eventos que disparan transiciones, y por qué modelar el estado como una máquina elimina estados imposibles.', t: ['FSM', 'transiciones', 'estados'] },
  { n: 'Statecharts', s: 'jerarquía y paralelismo', d: 'Los statecharts de Harel: estados jerárquicos, regiones paralelas, historia, y cómo domestican la explosión combinatoria de las FSM.', t: ['statecharts', 'Harel', 'jerarquía'] },
  { n: 'XState: el modelo', s: 'createMachine', d: 'XState v5: definir una máquina con estados y transiciones; el modelo de configuración y la ejecución determinista.', t: ['XState', 'createMachine', 'v5'] },
  { n: 'XState: context y lógica', s: 'guards y actions', d: 'El estado extendido (context), guards (transiciones condicionales), actions (efectos de entrada/salida), y assign para mutar el context.', t: ['context', 'guards', 'actions'] },
  { n: 'XState: el actor model', s: 'actores y mensajes', d: 'En XState v5 el actor es la unidad central: entidades vivas que se comunican por mensajes asíncronos; spawn e invoke de actores.', t: ['actores', 'mensajes', 'spawn'] },
  { n: 'XState: efectos y servicios', s: 'invoke y promesas', d: 'Invocar promesas, observables, callbacks y otras máquinas como actores; manejar su ciclo de vida, resultados y errores.', t: ['invoke', 'servicios', 'async'] },
  { n: 'Máquinas en la UI', s: 'React, Vue, Solid', d: 'Conectar una máquina a la UI con useMachine/useActor; renderizar según el estado, enviar eventos, y visualizar el statechart.', t: ['useMachine', 'UI', 'hooks'] },
  { n: 'Cuándo una máquina', s: 'y cuándo no', d: 'El criterio: dónde brillan las máquinas de estado (flujos complejos, wizards, media players) y dónde son sobreingeniería.', t: ['criterio', 'trade-offs', 'diseño'] },
  // — Flux / Redux (17-23) —
  { n: 'El patrón Flux', s: 'flujo unidireccional', d: 'Flux: el flujo de datos en una sola dirección (action → dispatcher → store → view); por qué Facebook lo creó y qué problema resolvió.', t: ['Flux', 'unidireccional', 'dispatch'] },
  { n: 'Redux', s: 'store, actions, reducers', d: 'Redux: un único store inmutable, actions que describen qué pasó, y reducers puros que calculan el siguiente estado; los tres principios.', t: ['Redux', 'reducer', 'store'] },
  { n: 'Redux Toolkit', s: 'slices y RTK Query', d: 'Redux Toolkit (el Redux moderno): createSlice, Immer integrado, createAsyncThunk, y RTK Query para el estado del servidor.', t: ['RTK', 'createSlice', 'RTK Query'] },
  { n: 'Middleware y efectos', s: 'thunk, saga, listener', d: 'Los side effects en Redux: thunks, sagas (generadores), y el listener middleware; dónde vive lo asíncrono en el flujo.', t: ['middleware', 'thunk', 'saga'] },
  { n: 'Selectores y normalización', s: 'reselect, entity adapter', d: 'Leer el store con eficiencia: selectores memoizados (reselect), estado normalizado, y createEntityAdapter para colecciones.', t: ['selectors', 'normalizar', 'reselect'] },
  { n: 'El post-Redux', s: 'Zustand, Jotai, Valtio', d: 'La nueva ola ligera: Zustand (store minimalista ~3KB), Jotai (átomos), Valtio (proxy); por qué Redux cayó del 57% al 38%.', t: ['Zustand', 'Jotai', 'Valtio'] },
  { n: 'Cuándo Redux', s: 'y las alternativas', d: 'El criterio en 2026: Redux Toolkit para equipos grandes y time-travel; Zustand para estado global simple; y el patrón dominante con TanStack Query.', t: ['criterio', 'elección', '2026'] },
  // — Arquitecturas unidireccionales (24-31) —
  { n: 'The Elm Architecture', s: 'Model, update, view', d: 'TEA: el patrón que inspiró a todos; Model (estado), Msg (mensajes), update (transición pura) y view; la fuente de la familia unidireccional.', t: ['Elm', 'TEA', 'update'] },
  { n: 'Elm: efectos', s: 'commands y subscriptions', d: 'Cómo Elm maneja lo impuro sin romper la pureza: Cmd (comandos), Sub (suscripciones), y el runtime que ejecuta los efectos por ti.', t: ['Cmd', 'Sub', 'runtime'] },
  { n: 'TCA: el modelo', s: 'Point-Free en Swift', d: 'The Composable Architecture: el Elm/Redux de Swift por Point-Free; State, Action, Reducer y Store; flujo unidireccional para SwiftUI.', t: ['TCA', 'Swift', 'Point-Free'] },
  { n: 'TCA: reducers y efectos', s: 'State, Action, Effect', d: 'El reducer de TCA: una función pura de estado y acción que devuelve efectos; Effect para lo asíncrono, y el store que lo orquesta.', t: ['reducer', 'Effect', 'store'] },
  { n: 'TCA: composición y test', s: 'dependencies, testing', d: 'La C de Composable: componer reducers de features, la inyección de dependencias, y el testing exhaustivo (TestStore) que hace único a TCA.', t: ['composición', 'dependencies', 'TestStore'] },
  { n: 'MVI', s: 'Model-View-Intent', d: 'Model-View-Intent: la intención del usuario como entrada, un modelo inmutable como salida, y el ciclo unidireccional en el mundo Android/Kotlin.', t: ['MVI', 'intent', 'Android'] },
  { n: 'Orbit MVI', s: 'container y side effects', d: 'Orbit (Kotlin): el container que reduce intents a estado, los side effects de una sola vez, y su ergonomía sobre coroutines.', t: ['Orbit', 'Kotlin', 'container'] },
  { n: 'La familia unidireccional', s: 'Redux, Elm, TCA, MVI', d: 'Comparar los primos: Redux, Elm, TCA y MVI comparten el ADN unidireccional; qué los une, qué los diferencia, y qué aprender de cada uno.', t: ['comparación', 'unidireccional', 'patrones'] },
  // — Patrones transversales (32-36) —
  { n: 'Estado del servidor', s: 'TanStack Query, SWR', d: 'El estado del servidor NO es estado de cliente: es una cache. TanStack Query y SWR; fetching, cache, revalidación, y por qué separarlo.', t: ['TanStack Query', 'SWR', 'cache'] },
  { n: 'Estado en la URL', s: 'el router como estado', d: 'La URL como fuente de verdad: search params, deep linking, estado compartible y navegable; cuándo el estado debe vivir en la URL.', t: ['URL', 'router', 'params'] },
  { n: 'Formularios como estado', s: 'el caso difícil', d: 'Los formularios son estado complejo: valores, validación, dirty/touched, envío; librerías (React Hook Form, TanStack Form) y el enfoque no controlado.', t: ['formularios', 'validación', 'forms'] },
  { n: 'Actualizaciones optimistas', s: 'sincronizar con el servidor', d: 'Optimistic updates: mostrar el resultado antes de la confirmación y revertir si falla; reconciliar el estado local con el del servidor.', t: ['optimista', 'sync', 'rollback'] },
  { n: 'Persistencia y offline', s: 'hidratación y estado local', d: 'Persistir el estado (localStorage, IndexedDB), hidratarlo al arrancar, y el estado offline; los peligros de la hidratación en SSR.', t: ['persistencia', 'hidratación', 'offline'] },
  // — Maestría (37-39) —
  { n: 'Elegir arquitectura', s: 'el árbol de decisión', d: 'El criterio unificado: signals vs store vs máquina vs arquitectura formal; separar estado de servidor, cliente y UI; el árbol de decisión completo.', t: ['decisión', 'arquitectura', 'criterio'] },
  { n: 'Local-first y CRDTs', s: 'el futuro del estado', d: 'Local-first: CRDTs (Yjs, Automerge), sincronización sin conflictos, y motores como Electric/Zero; el estado que vive en el cliente y converge.', t: ['local-first', 'CRDT', 'sync'] },
  { n: 'Nivel Dios: síntesis', s: 'la teoría del estado', d: 'La teoría unificada: todo estado es reactividad + una disciplina de mutación; conectar signals, máquinas y arquitecturas en un solo modelo mental.', t: ['síntesis', 'teoría', 'PhD'] },
]);

// ---------------------------------------------------------------------------
// TRACK: NEOVIM
// ---------------------------------------------------------------------------
const neovimNiveles: Nivel[] = [
  { id: 0, nombre: 'Novato', subtitulo: 'Fundamentos', color: 'var(--green)', colorHex: '#a6e3a1', icono: '0',
    descripcion: 'Entiende la filosofía modal y la "gramática" de Vim. Instala Neovim 0.12 y aprende a moverte y editar sin tocar el ratón.',
    tags: ['Modelo modal', 'Movimientos', 'Gramática Vim', 'Instalación'] },
  { id: 1, nombre: 'Aprendiz', subtitulo: 'Config desde cero', color: 'var(--blue)', colorHex: '#89b4fa', icono: '1',
    descripcion: 'Construye tu propia configuración en Lua desde un init.lua vacío. Opciones, keymaps, leader y tu primer gestor de plugins.',
    tags: ['init.lua', 'Lua', 'Keymaps', 'Gestor de plugins'] },
  { id: 2, nombre: 'Ninja', subtitulo: 'IDE completo', color: 'var(--mauve)', colorHex: '#cba6f7', icono: '2',
    descripcion: 'Convierte Neovim en un IDE: LSP nativo, autocompletado, Treesitter, Git, debugging y setups afinados para C, Rust, Swift y frontend.',
    tags: ['LSP', 'blink.cmp', 'DAP', 'C · Rust · Swift · React'] },
  { id: 3, nombre: 'Dios', subtitulo: 'Terminal · IA · Automatización', color: 'var(--peach)', colorHex: '#fab387', icono: '∞',
    descripcion: 'Domina la terminal entera: tmux/zellij, automatización de flujos, macros y registros, e integra IA en cada capa de tu edición.',
    tags: ['tmux · zellij', 'Macros', 'IA', 'Flujo definitivo'] },
  { id: 4, nombre: 'Maestro', subtitulo: 'Dominio profundo del editor', color: 'var(--teal)', colorHex: '#94e2d5', icono: '★',
    descripcion: 'Domina el editor hasta el último rincón: buffers y ventanas, plegado, el árbol de deshacer, la quickfix, y registros y marcas a nivel experto.',
    tags: ['Buffers · folds', 'Undo-tree', 'Quickfix', 'Registros pro'] },
  { id: 5, nombre: 'Arquitecto', subtitulo: 'Distribuciones y LazyVim', color: 'var(--yellow)', colorHex: '#f9e2af', icono: '⌂',
    descripcion: 'Distribuciones y LazyVim: cuándo usar una distro, LazyVim a fondo, personalizarlo sin romperlo y migrar con control total.',
    tags: ['LazyVim', 'Extras', 'Override', 'Migración'] },
  { id: 6, nombre: 'Sensei', subtitulo: 'El Dojo: práctica y maestría', color: 'var(--pink)', colorHex: '#f5c2e7', icono: '道',
    descripcion: 'El dojo: práctica deliberada, drills de vim-golf, un recorrido de entrenamiento guiado y un plan de 30 días para consolidar todo lo aprendido.',
    tags: ['Práctica', 'Vim-golf', 'Drills', 'Plan 30 días'] },
];

// ---------------------------------------------------------------------------
// TRACK: SWIFT & iOS
// ---------------------------------------------------------------------------
const swiftNiveles: Nivel[] = [
  { id: 0, nombre: 'Novato', subtitulo: 'Fundamentos de Swift 6.3', color: 'var(--green)', colorHex: '#a6e3a1', icono: '0',
    descripcion: 'Instala Xcode 26 y aprende la base del lenguaje: tipos, opcionales (el corazón de Swift), colecciones, funciones y closures.',
    tags: ['Xcode 26', 'Tipos', 'Opcionales', 'Closures'] },
  { id: 1, nombre: 'Aprendiz', subtitulo: 'Swift a fondo', color: 'var(--blue)', colorHex: '#89b4fa', icono: '1',
    descripcion: 'El modelo de tipos de Swift: structs vs clases, enums con valores asociados, protocolos, genéricos y manejo de errores con typed throws.',
    tags: ['Structs', 'Enums', 'Protocolos', 'Typed throws'] },
  { id: 2, nombre: 'Ninja', subtitulo: 'SwiftUI esencial', color: 'var(--mauve)', colorHex: '#cba6f7', icono: '2',
    descripcion: 'Construye interfaces declarativas: vistas, layout, modificadores, estado con @State/@Binding, listas y navegación.',
    tags: ['Vistas', 'Layout', '@State', 'Navegación'] },
  { id: 3, nombre: 'Experto', subtitulo: 'SwiftUI avanzado', color: 'var(--sky)', colorHex: '#89dceb', icono: '3',
    descripcion: 'Lleva SwiftUI al límite: @Observable, environment, animaciones, gestos, dibujo y las APIs nuevas de iOS 26.',
    tags: ['@Observable', 'Animaciones', 'Gestos', 'iOS 26'] },
  { id: 4, nombre: 'Arquitecto', subtitulo: 'Datos con SwiftData', color: 'var(--peach)', colorHex: '#fab387', icono: '4',
    descripcion: 'Persistencia moderna: @Model, @Query, relaciones, herencia de modelos, migraciones y sincronización con CloudKit.',
    tags: ['@Model', '@Query', 'Relaciones', 'CloudKit'] },
  { id: 5, nombre: 'Maestro', subtitulo: 'Concurrencia y redes', color: 'var(--teal)', colorHex: '#94e2d5', icono: '5',
    descripcion: 'El mundo real: async/await, actores, @MainActor, Sendable, la concurrencia estricta de Swift 6, y redes con URLSession + Codable.',
    tags: ['async/await', 'Actores', 'Sendable', 'URLSession'] },
  { id: 6, nombre: 'Dios', subtitulo: 'De la idea a la App Store', color: 'var(--pink)', colorHex: '#f5c2e7', icono: '🚀',
    descripcion: 'Ensambla una app real: arquitectura, inyección de dependencias, Swift Testing, accesibilidad, localización y publicación en la App Store.',
    tags: ['Arquitectura', 'Testing', 'Accesibilidad', 'App Store'] },
];

// ---------------------------------------------------------------------------
export const TRACKS: Track[] = [
  {
    id: 'neovim',
    nombre: 'Neovim',
    subtitulo: 'El editor a la velocidad del pensamiento',
    descripcion: 'De cero a nivel dios: modelo modal, tu propia config en Lua, un IDE para C/Rust/Swift/Frontend, terminal, automatización e IA.',
    logo: 'V',
    colorHex: '#cba6f7',
    gradFrom: '#cba6f7',
    gradTo: '#89b4fa',
    estado: 'disponible',
    ref: { cheatsheet: '/cheatsheet/', config: '/config/', recursos: '/recursos/' },
    niveles: neovimNiveles,
  },
  {
    id: 'swift',
    nombre: 'Swift & iOS',
    subtitulo: 'Desarrollo de apps para el ecosistema Apple',
    descripcion: 'Swift 6.3, SwiftUI, SwiftData y todo el desarrollo iOS: del lenguaje a publicar tu app en la App Store.',
    logo: 'S',
    colorHex: '#fab387',
    gradFrom: '#fab387',
    gradTo: '#f38ba8',
    estado: 'disponible',
    ref: { cheatsheet: '/swift/cheatsheet/' },
    niveles: swiftNiveles,
  },
  {
    id: 'c23',
    nombre: 'C23 moderno',
    subtitulo: 'El lenguaje y su entorno de sistemas',
    descripcion: 'De la sintaxis de C23 al nivel PhD: punteros, memoria, Meson, sanitizers, ABI, libc/musl, freestanding, concurrencia y tu propia libc.',
    logo: 'C',
    colorHex: '#89b4fa',
    gradFrom: '#89b4fa',
    gradTo: '#74c7ec',
    estado: 'disponible',
    categoria: 'systems',
    ref: { cheatsheet: '/c23/cheatsheet/' },
    niveles: c23Niveles,
  },
  {
    id: 'kernel',
    nombre: 'Kernel de Linux',
    subtitulo: 'C del kernel, tooling y Rust for Linux',
    descripcion: 'El corazón del sistema operativo: Kbuild, módulos, drivers, RCU, memoria del kernel, depuración y el nuevo Rust como lenguaje central.',
    logo: '🐧',
    colorHex: '#f9e2af',
    gradFrom: '#f9e2af',
    gradTo: '#fab387',
    estado: 'disponible',
    categoria: 'systems',
    ref: { cheatsheet: '/kernel/cheatsheet/' },
    niveles: kernelNiveles,
  },
  {
    id: 'rust',
    nombre: 'Rust',
    subtitulo: 'Sistemas seguros, del ownership al kernel',
    descripcion: 'Ownership, traits, lifetimes, async (edición 2024), unsafe/FFI, no_std, embebido, debugging y programación a nivel de tipos.',
    logo: '🦀',
    colorHex: '#fab387',
    gradFrom: '#fab387',
    gradTo: '#eba0ac',
    estado: 'disponible',
    categoria: 'systems',
    ref: { cheatsheet: '/rust/cheatsheet/' },
    niveles: rustNiveles,
  },
  {
    id: 'astro',
    nombre: 'Astro 7',
    subtitulo: 'El framework web content-first',
    descripcion: 'De islands architecture a producción: componentes, content collections, SSR/SSG, actions, view transitions, el compilador en Rust y desplegar en el edge.',
    logo: '🚀',
    colorHex: '#cba6f7',
    gradFrom: '#cba6f7',
    gradTo: '#f5c2e7',
    estado: 'disponible',
    categoria: 'frontend',
    ref: { cheatsheet: '/astro/cheatsheet/' },
    niveles: astroNiveles,
  },
  {
    id: 'solid',
    nombre: 'SolidJS',
    subtitulo: 'Reactividad fina, del signal al fullstack',
    descripcion: 'Reactividad de grano fino: signals, efectos, memos, stores, control flow, createResource, Solid 2.0 (async first-class) y SolidStart.',
    logo: '🧬',
    colorHex: '#89b4fa',
    gradFrom: '#89b4fa',
    gradTo: '#74c7ec',
    estado: 'disponible',
    categoria: 'frontend',
    ref: { cheatsheet: '/solid/cheatsheet/' },
    niveles: solidNiveles,
  },
  {
    id: 'build',
    nombre: 'Build & Producción',
    subtitulo: 'De pnpm a producción',
    descripcion: 'El camino a producción: pnpm, módulos, Vite y Rolldown, bundling, code splitting, lazy loading, monorepos y remote caching (Turborepo/Nx).',
    logo: '📦',
    colorHex: '#94e2d5',
    gradFrom: '#94e2d5',
    gradTo: '#a6e3a1',
    estado: 'disponible',
    categoria: 'frontend',
    ref: { cheatsheet: '/build/cheatsheet/' },
    niveles: buildTrackNiveles,
  },
  {
    id: 'estado',
    nombre: 'Reactividad y Estado',
    subtitulo: 'Signals, máquinas de estado y arquitecturas',
    descripcion: 'Los primitivos de reactividad y las arquitecturas de estado: signals, observables, máquinas de estado (XState), Flux/Redux, Elm, TCA y MVI/Orbit.',
    logo: '🔄',
    colorHex: '#b4befe',
    gradFrom: '#b4befe',
    gradTo: '#89dceb',
    estado: 'disponible',
    categoria: 'frontend',
    ref: { cheatsheet: '/estado/cheatsheet/' },
    niveles: estadoNiveles,
  },
  {
    id: 'cloudflare',
    nombre: 'Cloudflare',
    subtitulo: 'La plataforma del edge',
    descripcion: 'La plataforma developer de Cloudflare: Workers (isolates), D1, R2, KV, Durable Objects, Queues, Workers AI, Vectorize, Hyperdrive, Pages y Wrangler.',
    logo: '☁️',
    colorHex: '#fab387',
    gradFrom: '#fab387',
    gradTo: '#f9e2af',
    estado: 'proximamente',
    categoria: 'cloud',
    ref: {},
    niveles: [],
  },
];

export const CATEGORIAS: Categoria[] = [
  {
    id: 'systems',
    nombre: 'Systems Programming',
    descripcion: 'El corazón de la máquina: C moderno, el kernel de Linux y Rust. De la sintaxis al nivel PhD.',
    icono: '⚙️',
    colorHex: '#f38ba8',
    gradFrom: '#f38ba8',
    gradTo: '#fab387',
  },
  {
    id: 'frontend',
    nombre: 'Frontend',
    descripcion: 'La web moderna a fondo: frameworks (Astro, Solid), el camino a producción (build, bundling, monorepos) y las arquitecturas de reactividad y estado.',
    icono: '🎨',
    colorHex: '#89b4fa',
    gradFrom: '#89b4fa',
    gradTo: '#94e2d5',
  },
  {
    id: 'cloud',
    nombre: 'Cloud & Edge',
    descripcion: 'Desplegar y computar en el borde: la plataforma de Cloudflare y el modelo de edge computing.',
    icono: '☁️',
    colorHex: '#fab387',
    gradFrom: '#fab387',
    gradTo: '#f9e2af',
  },
];

export function tracksDeCategoria(catId: string): Track[] {
  return TRACKS.filter((t) => t.categoria === catId);
}

export function tracksSueltos(): Track[] {
  return TRACKS.filter((t) => !t.categoria);
}

export function getTrack(id: string): Track {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export function nivelDe(trackId: string, levelId: number): Nivel {
  const t = getTrack(trackId);
  return t.niveles.find((n) => n.id === levelId) ?? t.niveles[0];
}
