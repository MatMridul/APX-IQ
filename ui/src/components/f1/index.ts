/**
 * APX IQ F1 Components — central export
 *
 * Kept minimal by design (audit C5): two prior component generations were
 * removed. Live-cockpit instruments live in '@/components/cockpit' and are
 * imported directly; intelligence widgets are imported via
 * '@/components/f1/intelligence/*'. Only shared primitives + the connection
 * badge are re-exported here.
 */

export { Panel, Badge } from "./primitives";
export { default as ConnectionStatus } from "./ConnectionStatus";
