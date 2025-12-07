use ed25519_dalek::{Signer, SigningKey};
use rand::rngs::OsRng;
use serde::Serialize;

#[derive(Debug)]
pub struct KeyPair {
    pub signing_key: SigningKey,
}

impl KeyPair {
    pub fn new_random() -> Self {
        let mut csprng = OsRng {};
        let signing_key: SigningKey = SigningKey::generate(&mut csprng);
        Self { signing_key }
    }
}

fn get_keypair() -> KeyPair {
    // por simplicidade, gera uma chave nova a cada execução.
    // Em produção, você guardaria isso em arquivo/variável de ambiente.
    KeyPair::new_random()
}

pub fn sign_payload<T: Serialize>(payload: &T) -> String {
    let kp = get_keypair();
    let bytes = serde_json::to_vec(payload).expect("serializar payload");
    let signature = kp.signing_key.sign(&bytes);
    base64::encode(signature.to_bytes())
}
