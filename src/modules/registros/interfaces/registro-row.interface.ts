// Lo común de las filas de pedidos especiales, atrasos y casos: de qué local y
// de qué día.
export interface RegistroRow {
  id: number;
  fecha: string;
  local_id: number;
  local: string;
  ciudad: string;
}
