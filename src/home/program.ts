export const PROGRAMA = `fn main() {
    let mut maquina = Stack::new();

    // Una placa sola es una pieza.
    // Con lo que se ve y lo que se toca, es hardware.
    maquina.push(Hardware {
              placa:   Placa::micro_atx(),
        salidas: vec![Monitor, Teclado, Raton],
    });
}`;

export const SALIDA = [
  { t: 0, texto: '$ cargo run', clase: 'text-text' },
  { t: 520, texto: '   Compiling maquina v0.1.0', clase: 'text-overlay1' },
  { t: 1180, texto: '    Finished dev [unoptimized] in 0.61s', clase: 'text-overlay1' },
  { t: 1500, texto: '     Running `target/debug/maquina`', clase: 'text-green' },
];

export const TRAS_SALIDA = 420;
