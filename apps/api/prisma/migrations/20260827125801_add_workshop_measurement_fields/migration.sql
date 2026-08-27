-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "measurementFields" TEXT[] DEFAULT ARRAY['epaule', 'poitrine', 'taille', 'hanche', 'cou', 'bras', 'manche', 'longueur']::TEXT[];
