const hre = require("hardhat");

async function main() {
  const fakebg = await hre.ethers.deployContract("FakeBitGod");

  await fakebg.waitForDeployment();

  console.log(
    `Deployed to ${fakebg.target}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

//0x2D49708DedEb62c195D83F843Ad65E5d19b3445A