
const minimist = require('minimist');//获取进程参数


const execa = require('execa');//开启子进程
const args = minimist(process.argv.slice(2))

// 获取执行命令时 打包的参数
const target = args._.length ? args._[0] : 'reactivity'
const formats = args.f || 'global'; // esm-bunlder global cjs
const sourcemap = args.s || false


execa('rollup', [
    '-wc', // --watch --config  监控文件变化
    '--environment', //环境变量
    [
        `TARGET:${target}`,
        `FORMATS:${formats}`,
        sourcemap ? `SOURCE_MAP:true` : ``
    ].filter(Boolean).join(',')
],{
    stdio:'inherit', // 这个子进程的输出是在我们当前命令行中输出的
})

// pnpm run dev ->node dev.js
// dev.js -> rolliup打包 -> rollup.config.js