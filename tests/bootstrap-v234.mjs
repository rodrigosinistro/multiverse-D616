// Node-only test boot: Foundry supplies Hooks before modules load at runtime.
// The stub registers no runtime callbacks; tests provide their own mocks.
globalThis.Hooks ??= {once(){},on(){},off(){},call(){return true;}};
