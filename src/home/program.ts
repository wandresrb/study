export const PROGRAM = `fn main() {
    let mut maquina = Stack::new();

    // Una placa sola es una pieza.
    // Con lo que se ve y lo que se toca, es hardware.
    maquina.push(Hardware {
              placa:   Placa::micro_atx(),
        salidas: vec![Monitor, Teclado, Raton],
    });
}`;

export const OUTPUT = [
  { t: 0, text: '$ cargo run', cls: 'text-text' },
  { t: 520, text: '   Compiling maquina v0.1.0', cls: 'text-overlay1' },
  { t: 1180, text: '    Finished dev [unoptimized] in 0.61s', cls: 'text-overlay1' },
  { t: 1500, text: '     Running `target/debug/maquina`', cls: 'text-green' },
];

export const AFTER_OUTPUT = 420;
