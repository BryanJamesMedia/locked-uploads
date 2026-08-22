import { customAlphabet } from "nanoid";

/** No vowels, no look-alike characters: ids are read aloud and typed by hand. */
export const newSellerPublicId = customAlphabet("bcdfghjkmnpqrstvwxz23456789", 10);
