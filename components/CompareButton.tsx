"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Props {
    uid: string;
    nom: string;
    prenom: string | null;
    chambre: "AN" | "Senat";
}

const STORAGE_KEY = "comparer_elu_a";

export default function CompareButton({ uid, nom, prenom, chambre }: Props) {
    const router = useRouter();
    const [pending, setPending] = useState<{ uid: string; nom: string } | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { setPending(JSON.parse(stored)); } catch { }
        }
    }, []);

    const isCurrentPending = pending?.uid === uid;

    const handleClick = () => {
        if (!pending) {
            // Mémoriser cet élu comme élu A
            const data = { uid, nom: `${prenom ?? ""} ${nom}`.trim() };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            setPending(data);
            return;
        }

        if (isCurrentPending) {
            // Annuler la sélection
            sessionStorage.removeItem(STORAGE_KEY);
            setPending(null);
            return;
        }

        // Lancer la comparaison
        sessionStorage.removeItem(STORAGE_KEY);
        router.push(`/comparer?a=${pending.uid}&b=${uid}`);
    };

    if (isCurrentPending) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted border border-border px-3 py-1.5 bg-bg">
                    ✓ Sélectionné pour comparaison
                </span>
                <button
                    onClick={handleClick}
                    className="text-xs text-muted underline underline-offset-2 hover:text-text"
                >
                    Annuler
                </button>
            </div>
        );
    }

    if (pending) {
        return (
            <div className="flex flex-col gap-1">
                <button
                    onClick={handleClick}
                    className="text-xs px-3 py-1.5 bg-an text-white hover:opacity-80 transition-opacity text-left"
                >
                    Comparer avec {pending.nom} →
                </button>
                <button
                    onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setPending(null); }}
                    className="text-xs text-muted underline underline-offset-2 hover:text-text text-left"
                >
                    Annuler la sélection
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleClick}
            className="text-xs px-3 py-1.5 border border-border hover:border-text transition-colors"
        >
            Comparer cet élu
        </button>
    );
}
